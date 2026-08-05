import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  consumePackageReservation,
  packageAvailableMinutes,
  releasePackageReservation,
  reservePackageMinutes,
  stripeSessionAllowsReservationRelease,
} from '../src/lib/billing/package-reservations.ts';

const eligible = pkg => pkg.active !== false;
const basePackages = [
  { id: 'hybrid-one', type: 'hybrid', minutesRemaining: 100, minutesUsed: 20, minutesReserved: 0, rate: 1.5 },
  { id: 'ai-one', type: 'ai', minutesRemaining: 500, minutesUsed: 0, minutesReserved: 0, rate: 0.4 },
];

const reservation = reservePackageMinutes(basePackages, 'hybrid', 60, eligible);
assert.ok(reservation, 'a matching package with sufficient minutes should reserve');
assert.equal(reservation.packages[0].minutesRemaining, 100, 'reservation must not count as usage');
assert.equal(reservation.packages[0].minutesUsed, 20, 'reservation must not increase used minutes');
assert.equal(reservation.packages[0].minutesReserved, 60);
assert.equal(packageAvailableMinutes(reservation.packages[0]), 40, 'availability must exclude active reservations');
assert.equal(reservePackageMinutes(reservation.packages, 'hybrid', 50, eligible), null, 'a second job cannot consume reserved capacity');
assert.equal(reservePackageMinutes(basePackages, 'human', 1, eligible), null, 'one service cannot reserve another service package');

const released = releasePackageReservation(reservation.packages, reservation.allocations);
assert.ok(released);
assert.equal(released[0].minutesReserved, 0);
assert.equal(released[0].minutesRemaining, 100);
assert.equal(released[0].minutesUsed, 20);
assert.equal(releasePackageReservation(released, reservation.allocations), null, 'repeated reconciliation cannot release twice');

const consumed = consumePackageReservation(reservation.packages, reservation.allocations);
assert.ok(consumed);
assert.equal(consumed.minutesConsumed, 60);
assert.equal(consumed.packages[0].minutesReserved, 0);
assert.equal(consumed.packages[0].minutesRemaining, 40);
assert.equal(consumed.packages[0].minutesUsed, 80);
assert.equal(consumePackageReservation(consumed.packages, reservation.allocations), null, 'a consumed reservation cannot be consumed twice');
assert.equal(releasePackageReservation(consumed.packages, reservation.allocations), null, 'a consumed reservation cannot be released twice');
assert.equal(stripeSessionAllowsReservationRelease({ status: 'expired', payment_status: 'unpaid' }), true);
assert.equal(stripeSessionAllowsReservationRelease({ status: 'expired', payment_status: 'paid' }), false, 'paid sessions can never release reservations');
assert.equal(stripeSessionAllowsReservationRelease({ status: 'complete', payment_status: 'paid' }), false);
assert.equal(stripeSessionAllowsReservationRelease({ status: 'open', payment_status: 'unpaid' }), false, 'an unpaid but completable session must remain reserved');

const split = reservePackageMinutes([
  { id: 'human-one', type: 'human', minutesRemaining: 20, minutesReserved: 5, rate: 2.5 },
  { id: 'human-two', type: 'human', minutesRemaining: 50, minutesReserved: 0, rate: 2.5 },
], 'human', 40, eligible);
assert.ok(split);
assert.deepEqual(split.allocations.map(item => item.minutes), [15, 25], 'reservation can span matching packages without exceeding availability');

const checkoutSource = await readFile(new URL('../src/app/api/transcriptions/[id]/add-on-checkout/route.ts', import.meta.url), 'utf8');
const createSource = await readFile(new URL('../src/app/api/transcriptions/create/route.ts', import.meta.url), 'utf8');
const featureSource = await readFile(new URL('../src/lib/billing/package-add-on-feature.ts', import.meta.url), 'utf8');
const featureModule = await import('../src/lib/billing/package-add-on-feature.ts');

assert.equal(featureModule.isPackageAddOnCheckoutEnabled(undefined), false, 'missing feature flag must disable checkout');
assert.equal(featureModule.isPackageAddOnCheckoutEnabled(''), false, 'blank feature flag must disable checkout');
assert.equal(featureModule.isPackageAddOnCheckoutEnabled('false'), false, 'false feature flag must disable checkout');
assert.equal(featureModule.isPackageAddOnCheckoutEnabled('TRUE'), false, 'only lowercase exact true may enable checkout');
assert.equal(featureModule.isPackageAddOnCheckoutEnabled('true'), true, 'exact true must enable checkout');
assert.match(featureSource, /value === 'true'/, 'feature flag must use an exact true comparison');
assert.match(checkoutSource, /if \(!isPackageAddOnCheckoutEnabled\(\)\)/, 'checkout route must enforce the flag before work begins');
assert.ok(checkoutSource.indexOf('if (!isPackageAddOnCheckoutEnabled())') < checkoutSource.indexOf('adminAuth.verifyIdToken'), 'disabled checkout must return before authentication, reservation, or Stripe work');
assert.match(checkoutSource, /PACKAGE_ADD_ON_CHECKOUT_DISABLED/, 'checkout route must return the disabled error code');
assert.match(createSource, /packageAddOnPending && !isPackageAddOnCheckoutEnabled\(\)/, 'job creation must reject manipulated disabled add-on requests');
assert.ok(createSource.indexOf('packageAddOnPending && !isPackageAddOnCheckoutEnabled()') < createSource.indexOf("collection('transcriptions').add"), 'disabled add-on requests must be rejected before job creation');
const webhookSource = await readFile(new URL('../src/app/api/billing/webhook/route.ts', import.meta.url), 'utf8');
const deductSource = await readFile(new URL('../src/app/api/transcriptions/[id]/deduct/route.ts', import.meta.url), 'utf8');
const processSource = await readFile(new URL('../src/app/api/transcriptions/process/route.ts', import.meta.url), 'utf8');
const processingSource = await readFile(new URL('../src/lib/transcription/start-processing.ts', import.meta.url), 'utf8');
const reconciliationSource = await readFile(new URL('../src/app/api/admin/reconcile-package-reservations/route.ts', import.meta.url), 'utf8');

assert.match(checkoutSource, /runTransaction/, 'checkout must reserve in a Firestore transaction');
assert.match(checkoutSource, /reservePackageMinutes/, 'checkout must use authoritative package availability');
assert.match(checkoutSource, /packageReservationStatus === 'reserved'/, 'checkout retry must reuse an active reservation');
assert.match(checkoutSource, /idempotencyKey: `transcription-add-ons-\$\{reservation\.reservationId\}`/, 'Stripe checkout retries must use the stable reservation ID');
assert.match(checkoutSource, /expires_at:/, 'Stripe session expiry must align with reservation expiry');
assert.match(checkoutSource, /cancel_url: `\$\{returnUrl\}\?add_on_payment=canceled&job_id=/, 'browser cancellation must return to a non-authoritative status page');
assert.doesNotMatch(checkoutSource, /cancel_url:.*release/i, 'a browser cancellation return must not request reservation release');
assert.match(webhookSource, /checkout\.session\.expired/, 'verified Stripe expiry must be handled');
assert.match(webhookSource, /session\.payment_status !== 'paid'/, 'Checkout completion must not consume minutes until Stripe reports payment paid');
assert.match(webhookSource, /releasePackageReservation/, 'verified expiry must release package capacity');
assert.match(webhookSource, /consumePackageReservation/, 'verified payment must convert reserved minutes to usage');
assert.match(webhookSource, /payment-reconciliation-required/, 'corrupt paid reservations must be preserved for reconciliation');
assert.match(deductSource, /packageAvailableMinutes/, 'normal deductions must exclude active reservations');
assert.match(deductSource, /packageReservationStatus === 'consumed'/, 'normal deduction must not consume a paid reservation twice');
assert.match(processSource, /packageReservationStatus !== 'consumed'/, 'processing must wait for reservation consumption');
assert.match(processSource, /authorizationJob\.mode === 'hybrid'/, 'ordinary Hybrid processing must use the shared server path');
assert.match(processSource, /startTranscriptionProcessing/, 'the authenticated route must call the shared processing function');
assert.match(webhookSource, /result\.job\.mode === 'hybrid'/, 'only paid Hybrid add-on jobs should start Speechmatics');
assert.doesNotMatch(webhookSource, /result\.job\.mode === 'human'.*startTranscriptionProcessing/s, 'Human paid add-on jobs must remain in the admin workflow');
assert.match(webhookSource, /startTranscriptionProcessing/, 'the paid Hybrid webhook must use the shared processing function');
const hybridProcessingIndex = webhookSource.indexOf("result.job.mode === 'hybrid'");
assert.ok(hybridProcessingIndex < webhookSource.indexOf('if (!result.newlyPaid) return', hybridProcessingIndex), 'a retried webhook can recover processing after payment was already recorded');
assert.match(processingSource, /speechmaticsSubmissionStatus === 'submitted'/, 'a submitted marker must prevent duplicate Speechmatics submission');
assert.match(processingSource, /speechmaticsSubmissionStatus: 'submitting'/, 'processing must be claimed atomically before Speechmatics submission');
assert.match(processingSource, /processingFailureRecoverable: true/, 'post-payment Speechmatics failures must remain retryable');
assert.doesNotMatch(processingSource, /paymentStatus\s*:/, 'processing failure must not rewrite verified payment state');
assert.doesNotMatch(processingSource, /consumePackageReservation|releasePackageReservation/, 'processing must not alter consumed package minutes');
assert.match(reconciliationSource, /CRON_SECRET/, 'reconciliation must support scheduled-task authentication');
assert.match(reconciliationSource, /if \(!received \|\| !configured\) return false/, 'missing cron configuration or header must be rejected');
assert.match(reconciliationSource, /timingSafeEqual/, 'cron secret comparison must not use an ordinary string equality check');
assert.match(reconciliationSource, /role === 'admin'/, 'reconciliation must support verified administrators');
assert.match(reconciliationSource, /stripeSessionAllowsReservationRelease/, 'paid, completed, and ambiguous sessions must be preserved');
assert.match(reconciliationSource, /releasePackageReservation/, 'only confirmed expired sessions may release package capacity');
assert.doesNotMatch(reconciliationSource, /consumePackageReservation/, 'reconciliation must never consume package minutes');

console.log('Package reservation tests passed.');

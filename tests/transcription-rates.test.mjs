import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  TRANSCRIPTION_MODE_RATES,
  RUSH_SURCHARGE_RATES,
  supportsTranscriptionAddOns,
  transcriptionAddOnQuote,
  transcriptionAddOnRate,
  authoritativeAiRate,
  calculateAiCharge,
  isProfessionalEditorMembershipActive,
} from '../src/lib/billing/transcription-rates.ts';
import { shouldApplyMembershipEvent } from '../src/lib/billing/membership-lifecycle.ts';

assert.deepEqual(TRANSCRIPTION_MODE_RATES, { ai: 0.05, hybrid: 1.50, human: 2.50 });
const priceId = 'price_professional_editor';
const now = Date.UTC(2026, 7, 7);
const futurePeriodEnd = now + 60_000;
const activeMember = { source: 'stripe_webhook', status: 'active', stripePriceId: priceId, currentPeriodEnd: futurePeriodEnd, delinquent: false };
assert.equal(authoritativeAiRate({ ...activeMember, source: 'browser' }, priceId, now), 0.05, 'non-server membership data fails closed');
assert.equal(authoritativeAiRate(undefined, priceId, now), 0.05, 'non-member AI rate');
assert.equal(authoritativeAiRate(activeMember, priceId, now), 0.03, 'active membership with future period end');
assert.equal(authoritativeAiRate({ ...activeMember, currentPeriodEnd: now - 1 }, priceId, now), 0.05, 'expired active membership');
assert.equal(authoritativeAiRate({ status: 'active', stripePriceId: priceId }, priceId, now), 0.05, 'missing period end');
assert.equal(authoritativeAiRate({ ...activeMember, currentPeriodEnd: 'malformed' }, priceId, now), 0.05, 'malformed period end');
assert.equal(authoritativeAiRate({ ...activeMember, status: 'trialing' }, priceId, now), 0.05, 'trialing is not eligible');
assert.equal(authoritativeAiRate({ ...activeMember, status: 'payment_failed', delinquent: true, paymentFailed: true }, priceId, now), 0.05, 'payment failure immediately removes eligibility');
assert.equal(authoritativeAiRate({ ...activeMember, status: 'active', delinquent: false, paymentFailed: false }, priceId, now), 0.03, 'successful payment can restore eligibility');
assert.equal(authoritativeAiRate({ ...activeMember, cancelAtPeriodEnd: true }, priceId, now), 0.03, 'scheduled cancellation remains eligible during paid period');
assert.equal(authoritativeAiRate({ ...activeMember, cancelAtPeriodEnd: true, currentPeriodEnd: now }, priceId, now), 0.05, 'scheduled cancellation expires without deletion webhook');
assert.equal(authoritativeAiRate({ ...activeMember, stripePriceId: 'unrelated' }, priceId, now), 0.05, 'unrelated Stripe price cannot activate membership');
assert.equal(isProfessionalEditorMembershipActive({ ...activeMember, stripePriceId: 'browser-price' }, priceId, now), false);
assert.deepEqual(calculateAiCharge(10, 10, 0, undefined, priceId, now), { freeMinutesUsed: 10, packageMinutesUsed: 0, paidMinutes: 0, rate: 0.05, charge: 0 });
assert.deepEqual(calculateAiCharge(25, 10, 0, undefined, priceId, now), { freeMinutesUsed: 10, packageMinutesUsed: 0, paidMinutes: 15, rate: 0.05, charge: 0.75 });
assert.deepEqual(calculateAiCharge(25, 10, 0, activeMember, priceId, now), { freeMinutesUsed: 10, packageMinutesUsed: 0, paidMinutes: 15, rate: 0.03, charge: 0.44999999999999996 });
const newerCanceled = { status: 'canceled', delinquent: false, lastStripeEventCreated: 200, lastWebhookEventId: 'evt_cancel' };
const newerFailed = { status: 'payment_failed', delinquent: true, lastStripeEventCreated: 200, lastWebhookEventId: 'evt_failed' };
assert.equal(shouldApplyMembershipEvent(newerCanceled, { eventId: 'evt_old', eventCreated: 199, status: 'active', delinquent: false }), false);
assert.equal(shouldApplyMembershipEvent(newerFailed, { eventId: 'evt_old', eventCreated: 199, status: 'active', delinquent: false }), false);
assert.equal(shouldApplyMembershipEvent(newerFailed, { eventId: 'evt_paid', eventCreated: 201, status: 'active', delinquent: false }), true, 'later successful payment can restore membership');
assert.equal(shouldApplyMembershipEvent(activeMember, { eventId: 'evt_failed', eventCreated: 0, status: 'payment_failed', delinquent: true }), true, 'equal-time restrictive failure wins');
assert.deepEqual(RUSH_SURCHARGE_RATES, { hybrid: 0.50, human: 0.75 });
assert.equal(supportsTranscriptionAddOns('ai'), false);
assert.equal(supportsTranscriptionAddOns('hybrid'), true);
assert.equal(supportsTranscriptionAddOns('human'), true);
assert.equal(transcriptionAddOnRate('ai', { rushDelivery: true, speakerCount: 5 }), 0);
assert.equal(transcriptionAddOnRate('hybrid', { speakerCount: 4 }), 0);
assert.equal(transcriptionAddOnRate('hybrid', { speakerCount: 5 }), 0);
assert.equal(transcriptionAddOnRate('human', { rushDelivery: true, speakerCount: 5 }), 0.75);
assert.deepEqual(transcriptionAddOnQuote('ai', 60, { rushDelivery: true, speakerCount: 5 }), { rushCents: 0, speakerCents: 0, subtotalCents: 0 });
assert.deepEqual(transcriptionAddOnQuote('hybrid', 60, { rushDelivery: true, speakerCount: 5 }), { rushCents: 3000, speakerCents: 0, subtotalCents: 3000 });
assert.deepEqual(transcriptionAddOnQuote('human', 47, { rushDelivery: true, speakerCount: 5 }), { rushCents: 3525, speakerCents: 0, subtotalCents: 3525 });
assert.deepEqual(transcriptionAddOnQuote('human', 47, { rushDelivery: false, speakerCount: 5 }), { rushCents: 0, speakerCents: 0, subtotalCents: 0 });

const routeSource = await readFile(new URL('../src/app/api/transcriptions/[id]/deduct/route.ts', import.meta.url), 'utf8');
assert.match(routeSource, /supportsTranscriptionAddOns\(mode\)/, 'server deductions must enforce service eligibility');
assert.match(routeSource, /addOnCost = minutes \* addOnRate/, 'add-ons must be charged for the full audio duration');
assert.match(routeSource, /remaining \* applicableRate\) \+ addOnCost/, 'package minutes must cover transcription separately from add-ons');
assert.match(routeSource, /authoritativeAiRate\(user\.professionalEditorMembership\)/, 'server-owned membership must select the AI rate');
assert.doesNotMatch(routeSource, /validatedBody.*professionalEditor|request.*professionalEditor/, 'browser membership state must not select the AI rate');
assert.match(routeSource, /packageMinutesUsed > 0 && addOnRate > 0/, 'package add-ons must be routed away from legacy account-credit deduction');
assert.match(routeSource, /packageMinutesUsed > 0 && addOnRate > 0/, 'legacy deduction route must not silently use account credit for package add-ons');
assert.ok(
  routeSource.indexOf("packageMinutesUsed > 0 && addOnRate > 0") < routeSource.indexOf('const currentWallet'),
  'package add-ons must be rejected before legacy account credit is read or deducted',
);
assert.doesNotMatch(routeSource, /speakerCents|speaker surcharge/i, 'deduction route must not calculate automatic speaker charges');
assert.match(routeSource, /pkg\?\.type === mode/, 'package deductions must remain service-specific');
assert.match(routeSource, /transcription_billing_\$\{id\}/, 'deduction retries must remain idempotent');

const createRouteSource = await readFile(new URL('../src/app/api/transcriptions/create/route.ts', import.meta.url), 'utf8');
assert.match(createRouteSource, /supportsTranscriptionAddOns\(validatedBody\.mode\)/, 'job creation must normalize add-ons by service');
assert.match(createRouteSource, /rushDelivery: supportsAddOns \? validatedBody\.rushDelivery === true : false/, 'AI rush requests must be cleared');
assert.match(createRouteSource, /supportsAddOns \? \{ addOnCost: packageAddOnPending \? addOnQuote\.subtotalCents \/ 100 : 0 \} : \{\}/, 'AI jobs must omit add-on cost metadata');
assert.match(createRouteSource, /code: 'SPEAKER_QUOTE_REQUIRED'/, 'five or more speakers must be blocked for a custom quote before job creation');

const profileSource = await readFile(new URL('../src/app/api/auth/profile/route.ts', import.meta.url), 'utf8');
assert.match(profileSource, /if \(snapshot\.exists\) return/, 'existing users must not receive another trial');
assert.match(profileSource, /freeTrialMinutes: 60[\s\S]*freeTrialMinutesTotal: 60[\s\S]*freeTrialMinutesUsed: 0[\s\S]*freeTrialActive: true/, 'new users receive exactly 60 free minutes');
const membershipCheckoutSource = await readFile(new URL('../src/app/api/professional-editor/checkout/route.ts', import.meta.url), 'utf8');
const membershipStoreSource = await readFile(new URL('../src/lib/billing/professional-editor-membership.ts', import.meta.url), 'utf8');
assert.doesNotMatch(membershipCheckoutSource, /freeTrialMinutes/, 'membership signup must not reset trial fields');
assert.match(membershipCheckoutSource, /STRIPE_PROFESSIONAL_EDITOR_PRICE_ID|professionalEditorPriceId/, 'checkout uses configured server Price ID');
assert.doesNotMatch(membershipCheckoutSource + membershipStoreSource, /collection\(['"]transactions['"]\)/, 'membership lifecycle does not alter historical transactions');
assert.deepEqual({ hybrid: TRANSCRIPTION_MODE_RATES.hybrid, human: TRANSCRIPTION_MODE_RATES.human }, { hybrid: 1.50, human: 2.50 });

const checkoutSource = await readFile(new URL('../src/app/api/transcriptions/[id]/add-on-checkout/route.ts', import.meta.url), 'utf8');
const webhookSource = await readFile(new URL('../src/app/api/billing/webhook/route.ts', import.meta.url), 'utf8');
for (const eventName of ['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.payment_succeeded', 'invoice.payment_failed']) {
  assert.match(webhookSource, new RegExp(eventName.replaceAll('.', '\\.')), `webhook handles ${eventName}`);
}
assert.match(webhookSource, /subscriptionHasProfessionalEditorPrice/, 'webhook verifies the configured membership price');
assert.match(webhookSource, /_webhook_events/, 'webhook lifecycle updates retain event idempotency');
assert.match(webhookSource, /runTransaction[\s\S]*status: 'processing'/, 'webhook claims are atomic');
assert.match(webhookSource, /transaction\.delete\(processedEventsRef\)/, 'failed processing releases its claim for retry');
assert.match(webhookSource, /status: 'processed'/, 'successful claims are durably completed');
assert.match(webhookSource, /paymentFailed \? \{ status: 'payment_failed', delinquent: true, paymentFailed: true \}/, 'invoice failure explicitly removes entitlement');
const processSource = await readFile(new URL('../src/app/api/transcriptions/process/route.ts', import.meta.url), 'utf8');
const uploadSource = await readFile(new URL('../src/app/(protected)/upload/page.tsx', import.meta.url), 'utf8');
assert.match(checkoutSource, /transcriptionAddOnQuote\(reservation\.mode, reservation\.minutes/, 'Stripe add-on checkout must calculate from the server job reservation');
assert.doesNotMatch(checkoutSource, /automatic_tax|tax_rates/, 'add-on checkout must preserve the existing no-tax Checkout method');
assert.match(checkoutSource, /idempotencyKey: `transcription-add-ons-\$\{reservation\.reservationId\}`/, 'checkout creation must be idempotent');
assert.match(checkoutSource, /type: 'transcription-package-add-ons'/, 'checkout metadata must identify package add-ons');
assert.doesNotMatch(checkoutSource, /5\+ speaker service/, 'Stripe Checkout must contain no automatic speaker line item');
assert.match(checkoutSource, /rushDelivery: 'true'/, 'Stripe metadata must tie the rush selection to the job');
assert.match(checkoutSource, /packageId: reservation\.packageId/, 'Stripe metadata must identify the reserved package');
assert.match(webhookSource, /session\.amount_subtotal !== expectedSubtotalCents/, 'webhook must verify the server subtotal');
assert.match(webhookSource, /session\.amount_total !== expectedSubtotalCents/, 'webhook must verify the no-tax Stripe total');
assert.match(uploadSource, /Tax:<\/span><span>Not added/, 'client summary must describe the established no-tax Checkout method');
assert.match(uploadSource, /Add-on payment total:/, 'client total must match the amount sent to Stripe');
assert.match(webhookSource, /stripeAddOnCheckoutSessionId !== session\.id/, 'webhook must verify the stored Checkout Session');
assert.match(webhookSource, /walletUsed: 0/, 'paid package add-ons must never use legacy account credit');
assert.match(webhookSource, /consumePackageReservation/, 'webhook must consume the reserved package audio minutes');
assert.match(processSource, /package-pending-add-on.*paymentStatus !== 'paid'/s, 'unpaid add-on jobs must not start transcription');
assert.match(createRouteSource, /status: serverInitialStatus/, 'package add-on jobs must use their server-controlled pending status');
assert.match(createRouteSource, /billingType: 'package-pending-add-on'/, 'package add-on jobs must remain unpaid until the webhook');

console.log('Transcription pricing boundary tests passed.');

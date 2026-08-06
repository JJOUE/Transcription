import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  SPEAKER_SURCHARGE_RATES,
  TRANSCRIPTION_MODE_RATES,
  RUSH_SURCHARGE_RATES,
  supportsTranscriptionAddOns,
  transcriptionAddOnQuote,
  transcriptionAddOnRate,
} from '../src/lib/billing/transcription-rates.ts';

assert.deepEqual(TRANSCRIPTION_MODE_RATES, { ai: 0.40, hybrid: 1.50, human: 2.50 });
assert.deepEqual(SPEAKER_SURCHARGE_RATES, { hybrid: 0.25, human: 0.30 });
assert.deepEqual(RUSH_SURCHARGE_RATES, { hybrid: 0.50, human: 0.75 });
assert.equal(supportsTranscriptionAddOns('ai'), false);
assert.equal(supportsTranscriptionAddOns('hybrid'), true);
assert.equal(supportsTranscriptionAddOns('human'), true);
assert.equal(transcriptionAddOnRate('ai', { rushDelivery: true, speakerCount: 5 }), 0);
assert.equal(transcriptionAddOnRate('hybrid', { speakerCount: 4 }), 0);
assert.equal(transcriptionAddOnRate('hybrid', { speakerCount: 5 }), 0.25);
assert.equal(transcriptionAddOnRate('human', { rushDelivery: true, speakerCount: 5 }), 1.05);
assert.deepEqual(transcriptionAddOnQuote('ai', 60, { rushDelivery: true, speakerCount: 5 }), { rushCents: 0, speakerCents: 0, subtotalCents: 0 });
assert.deepEqual(transcriptionAddOnQuote('hybrid', 60, { rushDelivery: true, speakerCount: 5 }), { rushCents: 3000, speakerCents: 1500, subtotalCents: 4500 });
assert.deepEqual(transcriptionAddOnQuote('human', 47, { rushDelivery: true, speakerCount: 5 }), { rushCents: 3525, speakerCents: 1410, subtotalCents: 4935 });

const routeSource = await readFile(new URL('../src/app/api/transcriptions/[id]/deduct/route.ts', import.meta.url), 'utf8');
assert.match(routeSource, /supportsTranscriptionAddOns\(mode\)/, 'server deductions must enforce service eligibility');
assert.match(routeSource, /addOnCost = minutes \* addOnRate/, 'add-ons must be charged for the full audio duration');
assert.match(routeSource, /remaining \* TRANSCRIPTION_MODE_RATES\[mode\]\) \+ addOnCost/, 'package minutes must cover transcription separately from add-ons');
assert.match(routeSource, /packageMinutesUsed > 0 && addOnRate > 0/, 'package add-ons must be routed away from legacy account-credit deduction');
assert.match(routeSource, /packageMinutesUsed > 0 && addOnRate > 0/, 'legacy deduction route must not silently use account credit for package add-ons');
assert.ok(
  routeSource.indexOf("packageMinutesUsed > 0 && addOnRate > 0") < routeSource.indexOf('const currentWallet'),
  'package add-ons must be rejected before legacy account credit is read or deducted',
);
assert.doesNotMatch(routeSource, /SPEAKER_SURCHARGE_RATES\[mode\].*ai/, 'AI must not receive a speaker surcharge');
assert.match(routeSource, /pkg\?\.type === mode/, 'package deductions must remain service-specific');
assert.match(routeSource, /transcription_billing_\$\{id\}/, 'deduction retries must remain idempotent');

const createRouteSource = await readFile(new URL('../src/app/api/transcriptions/create/route.ts', import.meta.url), 'utf8');
assert.match(createRouteSource, /supportsTranscriptionAddOns\(validatedBody\.mode\)/, 'job creation must normalize add-ons by service');
assert.match(createRouteSource, /rushDelivery: supportsAddOns \? validatedBody\.rushDelivery === true : false/, 'AI rush requests must be cleared');
assert.match(createRouteSource, /supportsAddOns \? \{ addOnCost: packageAddOnPending \? addOnQuote\.subtotalCents \/ 100 : 0 \} : \{\}/, 'AI jobs must omit add-on cost metadata');

const checkoutSource = await readFile(new URL('../src/app/api/transcriptions/[id]/add-on-checkout/route.ts', import.meta.url), 'utf8');
const webhookSource = await readFile(new URL('../src/app/api/billing/webhook/route.ts', import.meta.url), 'utf8');
const processSource = await readFile(new URL('../src/app/api/transcriptions/process/route.ts', import.meta.url), 'utf8');
const uploadSource = await readFile(new URL('../src/app/(protected)/upload/page.tsx', import.meta.url), 'utf8');
assert.match(checkoutSource, /transcriptionAddOnQuote\(reservation\.mode, reservation\.minutes/, 'Stripe add-on checkout must calculate from the server job reservation');
assert.doesNotMatch(checkoutSource, /automatic_tax|tax_rates/, 'add-on checkout must preserve the existing no-tax Checkout method');
assert.match(checkoutSource, /idempotencyKey: `transcription-add-ons-\$\{reservation\.reservationId\}`/, 'checkout creation must be idempotent');
assert.match(checkoutSource, /type: 'transcription-package-add-ons'/, 'checkout metadata must identify package add-ons');
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

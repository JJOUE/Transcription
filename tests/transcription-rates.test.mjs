import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  SPEAKER_SURCHARGE_RATES,
  TRANSCRIPTION_MODE_RATES,
  RUSH_SURCHARGE_RATES,
  supportsTranscriptionAddOns,
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

const routeSource = await readFile(new URL('../src/app/api/transcriptions/[id]/deduct/route.ts', import.meta.url), 'utf8');
assert.match(routeSource, /supportsTranscriptionAddOns\(mode\)/, 'server deductions must enforce service eligibility');
assert.match(routeSource, /addOnCost = minutes \* addOnRate/, 'add-ons must be charged for the full audio duration');
assert.match(routeSource, /remaining \* TRANSCRIPTION_MODE_RATES\[mode\]\) \+ addOnCost/, 'package minutes must cover transcription separately from add-ons');
assert.match(routeSource, /packageMinutesUsed > 0 && addOnRate > 0/, 'package add-ons must be rejected before any balance write');
assert.match(routeSource, /PACKAGE_ADD_ON_PAYMENT_REQUIRED/, 'package add-on rejection must return a stable error');
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
assert.match(createRouteSource, /supportsAddOns \? \{ addOnCost: 0 \} : \{\}/, 'AI jobs must omit add-on cost metadata');
assert.match(createRouteSource, /hasMatchingPackage && requestedPaidAddOn/, 'job creation must reject package add-ons before creating a job');
assert.ok(
  createRouteSource.indexOf('hasMatchingPackage && requestedPaidAddOn') < createRouteSource.indexOf("collection('transcriptions').add"),
  'package add-ons must be rejected before a job is created',
);

console.log('Transcription pricing boundary tests passed.');

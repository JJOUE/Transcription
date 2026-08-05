import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  SPEAKER_SURCHARGE_RATES,
  TRANSCRIPTION_MODE_RATES,
} from '../src/lib/billing/transcription-rates.ts';

assert.deepEqual(TRANSCRIPTION_MODE_RATES, { ai: 0.40, hybrid: 1.50, human: 2.50 });
assert.deepEqual(SPEAKER_SURCHARGE_RATES, { hybrid: 0.25, human: 0.30 });

const routeSource = await readFile(new URL('../src/app/api/transcriptions/[id]/deduct/route.ts', import.meta.url), 'utf8');
assert.match(routeSource, /!hasPackageCoverage/, 'existing package add-on behavior must remain unchanged');
assert.match(routeSource, /speakerCount \|\| 1\) >= 5/, 'the surcharge boundary must remain five or more speakers');
assert.doesNotMatch(routeSource, /SPEAKER_SURCHARGE_RATES\[mode\].*ai/, 'AI must not receive a speaker surcharge');
assert.match(routeSource, /pkg\?\.type === mode/, 'package deductions must remain service-specific');
assert.match(routeSource, /transcription_billing_\$\{id\}/, 'deduction retries must remain idempotent');

console.log('Transcription pricing boundary tests passed.');

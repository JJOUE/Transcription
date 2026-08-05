import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const repoRoot = path.resolve(import.meta.dirname, '..');
const require = createRequire(path.join(repoRoot, 'package.json'));
const ts = require('typescript');

function loadTypeScriptModule(relativePath) {
  const filename = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const module = { exports: {} };
  new Function('module', 'exports', 'require', '__filename', '__dirname', output)(
    module,
    module.exports,
    require,
    filename,
    path.dirname(filename),
  );
  return module.exports;
}

const quote = loadTypeScriptModule('src/lib/quotes/document-workspace-quote.ts');
const billing = loadTypeScriptModule('src/lib/billing/document-workspace-submission.ts');

test('quote suggestions apply page rates and the CA$25 minimum', () => {
  assert.equal(quote.suggestedBaseAmount({ complexity: 'standard', finishedPages: 1, customBaseAmount: 0 }), 25);
  assert.equal(quote.suggestedBaseAmount({ complexity: 'standard', finishedPages: 5, customBaseAmount: 0 }), 30);
  assert.equal(quote.suggestedBaseAmount({ complexity: 'complex', finishedPages: 4, customBaseAmount: 0 }), 32);
});

test('quote totals, tax, courtesy discount, and hourly warning are calculated independently', () => {
  const result = quote.calculateDocumentWorkspaceQuote({
    outputType: 'Report', sourceAudioMinutes: 0, transcriptionCoveredByPackage: false,
    finishedPages: 5, complexity: 'standard', templateSupplied: false,
    preparationHours: 2, revisionsAmount: 5, revisionsNote: '', otherChargesAmount: 0,
    otherChargesReason: '', courtesyDiscount: 10, customBaseAmount: 0,
    customQuoteReason: '', approvedBaseAmount: 30, overrideReason: '', taxRate: 13,
    clientNotes: '', expiresAt: '',
  });
  assert.equal(result.subtotal, 25);
  assert.equal(result.taxAmount, 3.25);
  assert.equal(result.total, 28.25);
  assert.equal(result.effectiveHourlyRate, 12.5);
  assert.equal(result.lowHourlyRateWarning, true);
});

test('Human package selection excludes AI, inactive, exhausted, and expired packages', () => {
  const now = new Date('2026-08-04T12:00:00Z');
  const packages = [
    { id: 'ai', type: 'ai', minutesRemaining: 100 },
    { id: 'inactive', type: 'human', active: false, minutesRemaining: 100 },
    { id: 'expired', type: 'human', minutesRemaining: 100, expiresAt: '2026-01-01' },
    { id: 'valid', type: 'human', minutesRemaining: 50, purchasedAt: '2026-01-02' },
  ];
  assert.deepEqual(billing.getEligibleHumanPackages(packages, now).map((entry) => entry.pkg.id), ['valid']);
});

test('Human package deduction spans matching packages and deducts audio minutes only', () => {
  const packages = [
    { id: 'first', type: 'human', minutesUsed: 5, minutesRemaining: 20, rate: 1.5, purchasedAt: '2026-01-01' },
    { id: 'ai', type: 'ai', minutesUsed: 0, minutesRemaining: 500, rate: 0.4 },
    { id: 'second', type: 'human', minutesUsed: 0, minutesRemaining: 50, rate: 1.5, purchasedAt: '2026-02-01' },
  ];
  const result = billing.deductHumanPackageMinutes(packages, 47, new Date('2026-08-04'));
  assert.equal(result.kind, 'deducted');
  assert.equal(result.minutesUsed, 47);
  assert.equal(result.packages[0].minutesRemaining, 0);
  assert.equal(result.packages[1].minutesRemaining, 500);
  assert.equal(result.packages[2].minutesRemaining, 23);
});

test('Human package deduction does not mutate balances when minutes are insufficient', () => {
  const packages = [{ id: 'human', type: 'human', minutesRemaining: 10 }];
  const result = billing.deductHumanPackageMinutes(packages, 47, new Date('2026-08-04'));
  assert.equal(result.kind, 'insufficient');
  assert.equal(result.packages[0].minutesRemaining, 10);
  assert.equal(result.minutesUsed, 0);
});

test('deduction route contains ownership, transaction, and deterministic ledger guards', () => {
  const route = fs.readFileSync(path.join(repoRoot, 'src/app/api/transcriptions/[id]/deduct/route.ts'), 'utf8');
  assert.match(route, /job\.userId !== decoded\.uid/);
  assert.match(route, /runTransaction/);
  assert.match(route, /transcription_billing_\$\{id\}/);
  assert.match(route, /ledgerSnapshot\.exists/);
  assert.match(route, /pkg\?\.type === mode/);
});

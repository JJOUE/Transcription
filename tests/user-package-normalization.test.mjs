import assert from 'node:assert/strict';
import {
  getUserPackageMinuteBalances,
  normalizeUserPackages,
} from '../src/lib/utils/user-package-normalization.ts';

const embeddedHumanPackage = {
  id: 'package-1',
  sessionId: 'checkout-1',
  type: 'human',
  name: 'Human Transcription package',
  minutesTotal: 120,
  minutesUsed: 0,
  minutesRemaining: 120,
  active: true,
};

const embeddedOnly = normalizeUserPackages([embeddedHumanPackage], []);
assert.equal(embeddedOnly.length, 1);
assert.deepEqual(getUserPackageMinuteBalances(embeddedOnly), { ai: 0, hybrid: 0, human: 120 });
assert.equal(embeddedOnly[0].active, true, 'legacy packages without expiresAt remain active');

const subcollectionOnly = normalizeUserPackages([], [{
  id: 'package-2', type: 'hybrid', totalMinutes: 120, remainingMinutes: 75, active: true,
}]);
assert.deepEqual(getUserPackageMinuteBalances(subcollectionOnly), { ai: 0, hybrid: 75, human: 0 });

const duplicateById = normalizeUserPackages(
  [embeddedHumanPackage],
  [{ ...embeddedHumanPackage, minutesRemaining: 300, type: 'ai' }],
);
assert.equal(duplicateById.length, 1);
assert.equal(duplicateById[0].type, 'human', 'embedded authoritative package values win conflicts');
assert.equal(duplicateById[0].minutesRemaining, 120);

const duplicateBySession = normalizeUserPackages(
  [{ ...embeddedHumanPackage, id: 'embedded-package' }],
  [{ ...embeddedHumanPackage, id: 'subcollection-document' }],
);
assert.equal(duplicateBySession.length, 1, 'matching Stripe session references are deduplicated');

const withReservation = normalizeUserPackages([{
  id: 'package-3', type: 'human', minutesTotal: 100, minutesUsed: 0,
  minutesRemaining: 100, minutesReserved: 20, active: true,
}]);
assert.equal(withReservation[0].minutesRemaining, 100, 'normalization preserves the authoritative stored balance');
assert.equal(withReservation[0].availableMinutesRemaining, 80, 'active reservations reduce available display minutes');

console.log('User package normalization tests passed.');

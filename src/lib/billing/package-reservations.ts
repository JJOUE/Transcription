export interface PackageReservationAllocation {
  packageId: string;
  packageIndex: number;
  minutes: number;
}

type PackageRecord = Record<string, any>;

export function stripeSessionAllowsReservationRelease(session: { status?: string | null; payment_status?: string | null }) {
  return session.status === 'expired' && session.payment_status !== 'paid';
}

export function packageAvailableMinutes(pkg: PackageRecord) {
  return Math.max(0, Number(pkg.minutesRemaining || 0) - Number(pkg.minutesReserved || 0));
}

export function reservePackageMinutes(
  packagesInput: PackageRecord[],
  mode: string,
  minutes: number,
  isEligible: (pkg: PackageRecord) => boolean,
) {
  const packages = packagesInput.map(pkg => ({ ...pkg }));
  const eligible = packages
    .map((pkg, packageIndex) => ({ pkg, packageIndex }))
    .filter(({ pkg }) => pkg?.type === mode && isEligible(pkg) && packageAvailableMinutes(pkg) > 0)
    .sort((a, b) => Number(a.pkg.rate || 0) - Number(b.pkg.rate || 0));
  let remaining = minutes;
  const allocations: PackageReservationAllocation[] = [];

  for (const { pkg, packageIndex } of eligible) {
    if (remaining <= 0) break;
    const reserved = Math.min(remaining, packageAvailableMinutes(pkg));
    packages[packageIndex] = { ...pkg, minutesReserved: Number(pkg.minutesReserved || 0) + reserved };
    allocations.push({ packageId: String(pkg.id || `legacy-${packageIndex}`), packageIndex, minutes: reserved });
    remaining -= reserved;
  }

  return remaining > 0 ? null : { packages, allocations };
}

function findAllocationPackage(packages: PackageRecord[], allocation: PackageReservationAllocation) {
  const byId = packages.findIndex(pkg => pkg?.id && String(pkg.id) === allocation.packageId);
  return byId >= 0 ? byId : allocation.packageIndex;
}

export function releasePackageReservation(packagesInput: PackageRecord[], allocations: PackageReservationAllocation[]) {
  const packages = packagesInput.map(pkg => ({ ...pkg }));
  for (const allocation of allocations) {
    const index = findAllocationPackage(packages, allocation);
    const pkg = packages[index];
    if (!pkg || Number(pkg.minutesReserved || 0) < allocation.minutes) return null;
    packages[index] = { ...pkg, minutesReserved: Number(pkg.minutesReserved || 0) - allocation.minutes };
  }
  return packages;
}

export function consumePackageReservation(packagesInput: PackageRecord[], allocations: PackageReservationAllocation[]) {
  const packages = packagesInput.map(pkg => ({ ...pkg }));
  let packageValueUsed = 0;
  let minutesConsumed = 0;
  for (const allocation of allocations) {
    const index = findAllocationPackage(packages, allocation);
    const pkg = packages[index];
    if (!pkg || Number(pkg.minutesReserved || 0) < allocation.minutes || Number(pkg.minutesRemaining || 0) < allocation.minutes) return null;
    packages[index] = {
      ...pkg,
      minutesReserved: Number(pkg.minutesReserved || 0) - allocation.minutes,
      minutesRemaining: Number(pkg.minutesRemaining || 0) - allocation.minutes,
      minutesUsed: Number(pkg.minutesUsed || 0) + allocation.minutes,
    };
    packageValueUsed += allocation.minutes * Number(pkg.rate || 0);
    minutesConsumed += allocation.minutes;
  }
  return { packages, packageValueUsed, minutesConsumed };
}

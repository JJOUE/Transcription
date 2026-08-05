export type DocumentWorkspacePackage = {
  id?: string;
  type?: string;
  name?: string;
  minutesTotal?: number;
  minutesUsed?: number;
  minutesRemaining?: number;
  rate?: number;
  active?: boolean;
  purchasedAt?: unknown;
  expiresAt?: unknown;
};

export function packageDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'object' && value !== null && '_seconds' in value) {
    return new Date(Number((value as { _seconds: unknown })._seconds) * 1000);
  }
  const parsed = new Date(value as string | number);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getEligibleHumanPackages(packages: DocumentWorkspacePackage[], now = new Date()) {
  return packages
    .map((pkg, index) => ({ pkg, index }))
    .filter(({ pkg }) => {
      const expiresAt = packageDate(pkg.expiresAt);
      return pkg.type === 'human' &&
        pkg.active !== false &&
        Number(pkg.minutesRemaining || 0) > 0 &&
        (!expiresAt || expiresAt > now);
    })
    .sort((a, b) => (packageDate(a.pkg.purchasedAt)?.getTime() || 0) - (packageDate(b.pkg.purchasedAt)?.getTime() || 0));
}

export function deductHumanPackageMinutes(packages: DocumentWorkspacePackage[], minutes: number, now = new Date()) {
  const eligible = getEligibleHumanPackages(packages, now);
  const availableMinutes = eligible.reduce((sum, entry) => sum + Number(entry.pkg.minutesRemaining || 0), 0);
  if (eligible.length === 0) return { kind: 'none' as const, packages, minutesUsed: 0, valueUsed: 0, availableMinutes: 0 };
  if (availableMinutes < minutes) return { kind: 'insufficient' as const, packages, minutesUsed: 0, valueUsed: 0, availableMinutes };

  const updatedPackages = [...packages];
  let remaining = minutes;
  let minutesUsed = 0;
  let valueUsed = 0;
  for (const { pkg, index } of eligible) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, Number(pkg.minutesRemaining || 0));
    updatedPackages[index] = {
      ...pkg,
      minutesUsed: Number(pkg.minutesUsed || 0) + used,
      minutesRemaining: Number(pkg.minutesRemaining || 0) - used,
    };
    minutesUsed += used;
    valueUsed += used * Number(pkg.rate || 0);
    remaining -= used;
  }
  return { kind: 'deducted' as const, packages: updatedPackages, minutesUsed, valueUsed, availableMinutes };
}

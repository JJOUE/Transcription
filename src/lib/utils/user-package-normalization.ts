export type UserPackageType = 'ai' | 'hybrid' | 'human';

export interface NormalizedUserPackage {
  id: string;
  type: UserPackageType;
  name: string;
  minutesTotal: number;
  minutesUsed: number;
  minutesRemaining: number;
  minutesReserved: number;
  availableMinutesRemaining: number;
  rate: number;
  active: boolean;
  purchasedAt?: unknown;
  expiresAt?: unknown;
  updatedAt?: unknown;
  sessionId?: string;
  paymentIntentId?: string;
  stripePaymentIntentId?: string;
  [key: string]: unknown;
}

export type UserPackageMinuteBalances = Record<UserPackageType, number>;

const packageTypes = new Set<UserPackageType>(['ai', 'hybrid', 'human']);

const asNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const asDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'object' && value !== null) {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    if (typeof timestamp.toDate === 'function') return timestamp.toDate();
    const seconds = timestamp.seconds ?? timestamp._seconds;
    if (typeof seconds === 'number') return new Date(seconds * 1000);
  }
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sourceRecords = (source: unknown): Array<Record<string, unknown>> =>
  Array.isArray(source)
    ? source.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];

const identities = (pkg: Record<string, unknown>) => [
  pkg.id,
  pkg.packageId,
  pkg.sessionId,
  pkg.checkoutSessionId,
  pkg.stripeSessionId,
  pkg.paymentIntentId,
  pkg.stripePaymentIntentId,
].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

const recordsMatch = (left: Record<string, unknown>, right: Record<string, unknown>) => {
  const rightIds = new Set(identities(right));
  return identities(left).some(identity => rightIds.has(identity));
};

const normalizeRecord = (pkg: Record<string, unknown>, index: number): NormalizedUserPackage | null => {
  const rawType = String(pkg.type ?? pkg.serviceType ?? pkg.service ?? '').toLowerCase();
  if (!packageTypes.has(rawType as UserPackageType)) return null;

  const total = Math.max(0, asNumber(pkg.minutesTotal ?? pkg.totalMinutes ?? pkg.minutes));
  const rawRemaining = Math.max(0, asNumber(
    pkg.minutesRemaining ?? pkg.remainingMinutes,
    Math.max(0, total - asNumber(pkg.minutesUsed ?? pkg.usedMinutes)),
  ));
  const used = Math.max(0, asNumber(pkg.minutesUsed ?? pkg.usedMinutes, Math.max(0, total - rawRemaining)));
  const reserved = Math.max(0, asNumber(pkg.minutesReserved));
  const availableRemaining = Math.max(0, rawRemaining - reserved);
  const expiresAt = asDate(pkg.expiresAt);
  const active = pkg.active !== false && availableRemaining > 0 && (!expiresAt || expiresAt.getTime() > Date.now());
  const id = identities(pkg)[0] || `legacy-${rawType}-${index}`;

  return {
    ...pkg,
    id,
    type: rawType as UserPackageType,
    name: String(pkg.name || `${rawType} package`),
    minutesTotal: total,
    minutesUsed: used,
    minutesRemaining: rawRemaining,
    minutesReserved: reserved,
    availableMinutesRemaining: availableRemaining,
    rate: Math.max(0, asNumber(pkg.rate ?? pkg.perMinuteRate)),
    active,
    purchasedAt: pkg.purchasedAt,
    expiresAt: pkg.expiresAt,
    updatedAt: pkg.updatedAt,
    sessionId: typeof pkg.sessionId === 'string' ? pkg.sessionId : undefined,
    paymentIntentId: typeof pkg.paymentIntentId === 'string' ? pkg.paymentIntentId : undefined,
    stripePaymentIntentId: typeof pkg.stripePaymentIntentId === 'string' ? pkg.stripePaymentIntentId : undefined,
  };
};

/** Embedded records are first because current billing writes use users/{uid}.packages. */
export const normalizeUserPackages = (...sources: unknown[]): NormalizedUserPackage[] => {
  const merged: Array<Record<string, unknown>> = [];

  for (const source of sources) {
    for (const candidate of sourceRecords(source)) {
      const existingIndex = merged.findIndex(existing => recordsMatch(existing, candidate));
      if (existingIndex < 0) merged.push(candidate);
      else merged[existingIndex] = { ...candidate, ...merged[existingIndex] };
    }
  }

  return merged.map(normalizeRecord).filter((pkg): pkg is NormalizedUserPackage => pkg !== null);
};

export const getUserPackageMinuteBalances = (packages: unknown): UserPackageMinuteBalances => {
  const balances: UserPackageMinuteBalances = { ai: 0, hybrid: 0, human: 0 };
  for (const pkg of normalizeUserPackages(packages)) {
    if (pkg.active) balances[pkg.type] += pkg.availableMinutesRemaining;
  }
  return balances;
};

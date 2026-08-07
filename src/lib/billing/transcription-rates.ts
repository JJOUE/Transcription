export const AI_NON_MEMBER_RATE = 0.05;
export const AI_PROFESSIONAL_EDITOR_RATE = 0.03;
export const PROFESSIONAL_EDITOR_MONTHLY_PRICE_CENTS = 1999;

export const TRANSCRIPTION_MODE_RATES = { ai: AI_NON_MEMBER_RATE, hybrid: 1.50, human: 2.50 } as const;

export type ProfessionalEditorMembershipState = {
  source?: string;
  status?: string;
  stripePriceId?: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: unknown;
  delinquent?: boolean;
  paymentFailed?: boolean;
};

function membershipPeriodEndMillis(value: unknown): number | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    const millis = value.toMillis();
    return Number.isFinite(millis) ? millis : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const millis = new Date(value).getTime();
    return Number.isFinite(millis) ? millis : null;
  }
  return null;
}

/**
 * Authoritative AI rate selector. Callers must pass server-read membership data;
 * browser-provided status or pricing values are never accepted.
 *
 * Professional Editor entitlement enforcement is intentionally deferred.
 * Current owner access is preserved to avoid breaking existing transcripts.
 */
export function isProfessionalEditorMembershipActive(
  membership: ProfessionalEditorMembershipState | null | undefined,
  configuredPriceId = process.env.STRIPE_PROFESSIONAL_EDITOR_PRICE_ID,
  serverNowMillis = Date.now(),
): boolean {
  if (!configuredPriceId || membership?.source !== 'stripe_webhook' || membership.stripePriceId !== configuredPriceId) return false;
  if (membership.status !== 'active' || membership.delinquent === true || membership.paymentFailed === true) return false;
  const periodEndMillis = membershipPeriodEndMillis(membership.currentPeriodEnd);
  return periodEndMillis !== null && periodEndMillis > serverNowMillis;
}

export function authoritativeAiRate(
  membership: ProfessionalEditorMembershipState | null | undefined,
  configuredPriceId = process.env.STRIPE_PROFESSIONAL_EDITOR_PRICE_ID,
  serverNowMillis = Date.now(),
): number {
  return isProfessionalEditorMembershipActive(membership, configuredPriceId, serverNowMillis)
    ? AI_PROFESSIONAL_EDITOR_RATE
    : AI_NON_MEMBER_RATE;
}

export function calculateAiCharge(
  minutes: number,
  freeMinutes: number,
  packageMinutes: number,
  membership: ProfessionalEditorMembershipState | null | undefined,
  configuredPriceId = process.env.STRIPE_PROFESSIONAL_EDITOR_PRICE_ID,
  serverNowMillis = Date.now(),
) {
  const totalMinutes = Math.max(0, Number(minutes) || 0);
  const freeMinutesUsed = Math.min(totalMinutes, Math.max(0, Number(freeMinutes) || 0));
  const afterFree = totalMinutes - freeMinutesUsed;
  const packageMinutesUsed = Math.min(afterFree, Math.max(0, Number(packageMinutes) || 0));
  const paidMinutes = afterFree - packageMinutesUsed;
  const rate = authoritativeAiRate(membership, configuredPriceId, serverNowMillis);
  return { freeMinutesUsed, packageMinutesUsed, paidMinutes, rate, charge: paidMinutes * rate };
}

export const RUSH_SURCHARGE_RATES = { hybrid: 0.50, human: 0.75 } as const;

export type AddOnEligibleTranscriptionMode = keyof typeof RUSH_SURCHARGE_RATES;

export function supportsTranscriptionAddOns(mode: string): mode is AddOnEligibleTranscriptionMode {
  return mode === 'hybrid' || mode === 'human';
}

export function transcriptionAddOnRate(
  mode: string,
  options: { rushDelivery?: boolean; speakerCount?: number },
): number {
  if (!supportsTranscriptionAddOns(mode)) return 0;
  return options.rushDelivery === true ? RUSH_SURCHARGE_RATES[mode] : 0;
}


export function transcriptionAddOnQuote(
  mode: string,
  minutes: number,
  options: { rushDelivery?: boolean; speakerCount?: number },
) {
  const safeMinutes = Math.max(0, Number(minutes) || 0);
  if (!supportsTranscriptionAddOns(mode)) {
    return { rushCents: 0, speakerCents: 0, subtotalCents: 0 };
  }

  const rushCents = options.rushDelivery === true
    ? Math.round(safeMinutes * RUSH_SURCHARGE_RATES[mode] * 100)
    : 0;
  // Five or more speakers require a custom quote and never enter automatic Checkout.
  const speakerCents = 0;

  return { rushCents, speakerCents, subtotalCents: rushCents + speakerCents };
}
export const PACKAGE_ADD_ON_DISABLED_MESSAGE =
  'Rush delivery requires a separate payment. Please contact support before submitting.';

export const SPEAKER_CUSTOM_QUOTE_MESSAGE =
  'Recordings with more than four speakers require a custom quote.';

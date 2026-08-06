export const TRANSCRIPTION_MODE_RATES = { ai: 0.40, hybrid: 1.50, human: 2.50 } as const;

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

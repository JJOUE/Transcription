export const TRANSCRIPTION_MODE_RATES = { ai: 0.40, hybrid: 1.50, human: 2.50 } as const;

export const SPEAKER_SURCHARGE_RATES = { hybrid: 0.25, human: 0.30 } as const;

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

  let rate = 0;
  if (options.rushDelivery === true) rate += RUSH_SURCHARGE_RATES[mode];
  if (Number(options.speakerCount || 1) >= 5) rate += SPEAKER_SURCHARGE_RATES[mode];
  return rate;
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
  const speakerCents = Number(options.speakerCount || 1) >= 5
    ? Math.round(safeMinutes * SPEAKER_SURCHARGE_RATES[mode] * 100)
    : 0;

  return { rushCents, speakerCents, subtotalCents: rushCents + speakerCents };
}
export const PACKAGE_ADD_ON_DISABLED_MESSAGE =
  'Rush service and recordings with more than four speakers require a separate payment. Please contact support before submitting.';

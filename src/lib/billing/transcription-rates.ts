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

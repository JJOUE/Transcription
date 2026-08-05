export const STANDARD_PAGE_RATE = 6;
export const COMPLEX_PAGE_RATE = 8;
export const MINIMUM_SUGGESTED_CHARGE = 25;
export const LOW_EFFECTIVE_HOURLY_RATE = 40;
export const STANDARD_PAGE_DEFINITION =
  'Approximately 400–500 words in ordinary business formatting. Tables, forms, unusual margins, dense layouts, and extensive restructuring may require a custom quote.';

export type DocumentQuoteComplexity = 'standard' | 'complex' | 'custom';

export interface DocumentWorkspaceQuoteInput {
  outputType: string;
  sourceAudioMinutes: number;
  transcriptionCoveredByPackage: boolean;
  finishedPages: number;
  complexity: DocumentQuoteComplexity;
  templateSupplied: boolean;
  preparationHours: number;
  revisionsAmount: number;
  revisionsNote: string;
  otherChargesAmount: number;
  otherChargesReason: string;
  courtesyDiscount: number;
  customBaseAmount: number;
  customQuoteReason: string;
  approvedBaseAmount: number;
  overrideReason: string;
  taxRate: number;
  clientNotes: string;
  expiresAt: string;
}

export function suggestedBaseAmount(input: Pick<DocumentWorkspaceQuoteInput, 'complexity' | 'finishedPages' | 'customBaseAmount'>) {
  if (input.complexity === 'custom') return Math.max(0, input.customBaseAmount);
  const rate = input.complexity === 'complex' ? COMPLEX_PAGE_RATE : STANDARD_PAGE_RATE;
  return Math.max(MINIMUM_SUGGESTED_CHARGE, input.finishedPages * rate);
}

export function isMaterialQuoteOverride(suggested: number, approved: number) {
  return Math.abs(suggested - approved) >= Math.max(5, suggested * 0.1);
}

export function calculateDocumentWorkspaceQuote(input: DocumentWorkspaceQuoteInput) {
  const suggested = suggestedBaseAmount(input);
  const subtotalBeforeDiscount = Math.max(0, input.approvedBaseAmount) +
    Math.max(0, input.revisionsAmount) + Math.max(0, input.otherChargesAmount);
  const subtotal = Math.max(0, subtotalBeforeDiscount - Math.max(0, input.courtesyDiscount));
  const taxAmount = subtotal * (Math.max(0, input.taxRate) / 100);
  const total = subtotal + taxAmount;
  const effectiveHourlyRate = input.preparationHours > 0 ? subtotal / input.preparationHours : null;

  return {
    suggestedBaseAmount: roundMoney(suggested),
    subtotalBeforeDiscount: roundMoney(subtotalBeforeDiscount),
    subtotal: roundMoney(subtotal),
    taxAmount: roundMoney(taxAmount),
    total: roundMoney(total),
    effectiveHourlyRate: effectiveHourlyRate === null ? null : roundMoney(effectiveHourlyRate),
    lowHourlyRateWarning: effectiveHourlyRate !== null && effectiveHourlyRate < LOW_EFFECTIVE_HOURLY_RATE,
    materialOverride: isMaterialQuoteOverride(suggested, input.approvedBaseAmount),
  };
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

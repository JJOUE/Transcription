'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Calculator, LockKeyhole } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import {
  COMPLEX_PAGE_RATE,
  LOW_EFFECTIVE_HOURLY_RATE,
  MINIMUM_SUGGESTED_CHARGE,
  STANDARD_PAGE_DEFINITION,
  STANDARD_PAGE_RATE,
  calculateDocumentWorkspaceQuote,
  suggestedBaseAmount,
  type DocumentQuoteComplexity,
  type DocumentWorkspaceQuoteInput,
} from '@/lib/quotes/document-workspace-quote';
import type { TranscriptionJob } from '@/lib/firebase/transcriptions';

const money = (value: number) => `CA$${value.toFixed(2)}`;
const numberValue = (value: string) => Math.max(0, Number(value) || 0);

export function DocumentWorkspaceQuoteCalculator({ job, onSaved }: { job: TranscriptionJob; onSaved: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [input, setInput] = useState<DocumentWorkspaceQuoteInput>({
    outputType: '',
    sourceAudioMinutes: Math.ceil((job.duration || 0) / 60),
    transcriptionCoveredByPackage: job.billingType === 'human-package',
    finishedPages: 1,
    complexity: 'standard',
    templateSupplied: Boolean(job.templatePath || job.templateFilename),
    preparationHours: 0,
    revisionsAmount: 0,
    revisionsNote: '',
    otherChargesAmount: 0,
    otherChargesReason: '',
    courtesyDiscount: 0,
    customBaseAmount: MINIMUM_SUGGESTED_CHARGE,
    customQuoteReason: '',
    approvedBaseAmount: MINIMUM_SUGGESTED_CHARGE,
    overrideReason: '',
    taxRate: 13,
    clientNotes: '',
    expiresAt: '',
  });

  const suggestion = useMemo(() => suggestedBaseAmount(input), [input]);
  const calculation = useMemo(() => calculateDocumentWorkspaceQuote(input), [input]);
  const frozen = job.officeQuote?.status === 'sent';
  const set = <K extends keyof DocumentWorkspaceQuoteInput>(field: K, value: DocumentWorkspaceQuoteInput[K]) =>
    setInput(current => ({ ...current, [field]: value }));

  const submit = async () => {
    if (!job.id || !user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/document-workspace/${job.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(input),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Quote could not be frozen');
      toast({
        title: result.duplicate ? 'Quote already frozen' : 'Quote approved and frozen',
        description: result.duplicate
          ? 'The previously sent quote remains unchanged.'
          : `${money(calculation.total)} is now the frozen quote for this project. No payment was charged.`,
      });
      setOpen(false);
      onSaved();
    } catch (error) {
      toast({ title: 'Quote not saved', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (frozen) {
    return (
      <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4" /> Quote sent and frozen</p>
        <p className="mt-1">Total: {money(Number(job.officeQuote?.total || 0))}. Frozen quote fields cannot be recalculated automatically.</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-900">This project requires an administrator-approved quote. Suggestions never create a bill.</p>
        <Button type="button" size="sm" className="mt-3 bg-[#003366] text-white hover:bg-[#002244]" onClick={() => setOpen(true)}>
          <Calculator className="mr-2 h-4 w-4" /> Prepare Quote
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-5 rounded-md border border-[#b29dd9] bg-white p-4">
      <div>
        <h4 className="font-semibold text-[#003366]">Document Workspace quote review</h4>
        <p className="mt-1 text-sm text-gray-600">Internal quoting aid only. Review every field before approving and freezing the quote.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">Output type
          <Input className="mt-1" value={input.outputType} onChange={event => set('outputType', event.target.value)} placeholder="Letter, report, case note, memo..." />
        </label>
        <label className="text-sm font-medium text-gray-700">Source audio duration (minutes)
          <Input className="mt-1" type="number" min="0" step="1" value={input.sourceAudioMinutes} onChange={event => set('sourceAudioMinutes', numberValue(event.target.value))} />
        </label>
        <label className="text-sm font-medium text-gray-700">Estimated or actual finished pages
          <Input className="mt-1" type="number" min="1" step="1" value={input.finishedPages} onChange={event => set('finishedPages', numberValue(event.target.value))} />
        </label>
        <label className="text-sm font-medium text-gray-700">Formatting level
          <select className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3" value={input.complexity} onChange={event => set('complexity', event.target.value as DocumentQuoteComplexity)}>
            <option value="standard">Standard finished page</option>
            <option value="complex">Complex finished page</option>
            <option value="custom">Custom quote</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={input.transcriptionCoveredByPackage} onChange={event => set('transcriptionCoveredByPackage', event.target.checked)} />
          Transcription covered by package minutes
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={input.templateSupplied} onChange={event => set('templateSupplied', event.target.checked)} />
          Template supplied
        </label>
      </div>

      <p className="rounded-md bg-slate-50 p-3 text-xs text-slate-700"><strong>Standard page:</strong> {STANDARD_PAGE_DEFINITION}</p>

      {input.complexity === 'custom' && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">Custom suggested amount
            <Input className="mt-1" type="number" min="0" step="0.01" value={input.customBaseAmount} onChange={event => set('customBaseAmount', numberValue(event.target.value))} />
          </label>
          <label className="text-sm font-medium text-gray-700">Custom quote reason
            <Textarea className="mt-1" value={input.customQuoteReason} onChange={event => set('customQuoteReason', event.target.value)} />
          </label>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700">Preparation time (hours, internal)
          <Input className="mt-1" type="number" min="0" step="0.25" value={input.preparationHours} onChange={event => set('preparationHours', numberValue(event.target.value))} />
        </label>
        <label className="text-sm font-medium text-gray-700">Approved document-preparation amount
          <Input className="mt-1" type="number" min="0" step="0.01" value={input.approvedBaseAmount} onChange={event => set('approvedBaseAmount', numberValue(event.target.value))} />
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => set('approvedBaseAmount', suggestion)}>Use suggestion: {money(suggestion)}</Button>
        </label>
        <label className="text-sm font-medium text-gray-700">Revision charge
          <Input className="mt-1" type="number" min="0" step="0.01" value={input.revisionsAmount} onChange={event => set('revisionsAmount', numberValue(event.target.value))} />
          {input.revisionsAmount > 0 && <Textarea className="mt-2" placeholder="Revision charge reason" value={input.revisionsNote} onChange={event => set('revisionsNote', event.target.value)} />}
        </label>
        <label className="text-sm font-medium text-gray-700">Other approved charges
          <Input className="mt-1" type="number" min="0" step="0.01" value={input.otherChargesAmount} onChange={event => set('otherChargesAmount', numberValue(event.target.value))} />
          {input.otherChargesAmount > 0 && <Textarea className="mt-2" placeholder="Other charge reason" value={input.otherChargesReason} onChange={event => set('otherChargesReason', event.target.value)} />}
        </label>
        <label className="text-sm font-medium text-gray-700">Courtesy discount
          <Input className="mt-1" type="number" min="0" step="0.01" value={input.courtesyDiscount} onChange={event => set('courtesyDiscount', numberValue(event.target.value))} />
        </label>
        <label className="text-sm font-medium text-gray-700">Tax rate (%)
          <Input className="mt-1" type="number" min="0" step="0.01" value={input.taxRate} onChange={event => set('taxRate', numberValue(event.target.value))} />
        </label>
        <label className="text-sm font-medium text-gray-700">Quote expiry date (optional)
          <Input className="mt-1" type="date" value={input.expiresAt} onChange={event => set('expiresAt', event.target.value)} />
        </label>
      </div>

      <label className="block text-sm font-medium text-gray-700">Client-facing quote notes (optional)
        <Textarea className="mt-1" value={input.clientNotes} onChange={event => set('clientNotes', event.target.value)} placeholder="Information the client should see with the quote" />
      </label>

      {calculation.materialOverride && (
        <label className="block text-sm font-medium text-gray-700">Internal override reason
          <Textarea className="mt-1" value={input.overrideReason} onChange={event => set('overrideReason', event.target.value)} placeholder="Required because the approved amount materially differs from the suggestion" />
        </label>
      )}

      <div className="space-y-1 border-t pt-4 text-sm">
        <p className="flex justify-between"><span>Internal page suggestion</span><strong>{money(calculation.suggestedBaseAmount)}</strong></p>
        <p className="flex justify-between"><span>Approved preparation amount</span><strong>{money(input.approvedBaseAmount)}</strong></p>
        <p className="flex justify-between"><span>Charges before discount</span><strong>{money(calculation.subtotalBeforeDiscount)}</strong></p>
        <p className="flex justify-between"><span>Courtesy discount</span><strong>-{money(input.courtesyDiscount)}</strong></p>
        <p className="flex justify-between"><span>Subtotal</span><strong>{money(calculation.subtotal)}</strong></p>
        <p className="flex justify-between"><span>Tax</span><strong>{money(calculation.taxAmount)}</strong></p>
        <p className="flex justify-between text-base text-[#003366]"><span>Total</span><strong>{money(calculation.total)}</strong></p>
        <p className="flex justify-between"><span>Effective hourly rate</span><strong>{calculation.effectiveHourlyRate === null ? 'Not available' : `${money(calculation.effectiveHourlyRate)}/hour`}</strong></p>
      </div>

      {calculation.lowHourlyRateWarning && (
        <p className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Effective hourly rate is below {money(LOW_EFFECTIVE_HOURLY_RATE)}/hour. Review the amount or record why the quote is appropriate.
        </p>
      )}

      <p className="text-xs text-gray-600">Internal rates: standard {money(STANDARD_PAGE_RATE)}/page; complex {money(COMPLEX_PAGE_RATE)}/page; minimum suggestion {money(MINIMUM_SUGGESTED_CHARGE)}. No verbatim surcharge is used.</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
        <Button type="button" className="bg-[#003366] text-white hover:bg-[#002244]" onClick={submit} disabled={saving}>
          {saving ? 'Freezing quote...' : 'Approve & Freeze Quote'}
        </Button>
      </div>
    </div>
  );
}

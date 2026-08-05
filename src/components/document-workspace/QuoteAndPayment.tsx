'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import type { TranscriptionJob } from '@/lib/firebase/transcriptions';

const money = (value: number) => `CA$${value.toFixed(2)}`;

export function QuoteAndPayment({ project, isAdmin = false }: { project: TranscriptionJob; isAdmin?: boolean }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const quote = project.officeQuote;
  if (!quote) return null;
  const total = Number(quote.total || 0);

  const respond = async (action: 'accept' | 'decline') => {
    if (action === 'decline' && !window.confirm('Decline this quote? Talk to Text Canada will not proceed under this quote.')) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/document-workspace/${project.id}/quote-response`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, quoteId: quote.quoteId, quoteVersion: quote.version }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Response could not be saved');
      toast({ title: action === 'accept' ? 'Quote accepted' : 'Quote declined' });
      window.location.reload();
    } catch (error) {
      toast({ title: 'Quote response failed', description: error instanceof Error ? error.message : 'Please refresh and try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <div className="mb-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="font-semibold">Project quote</p><p>Reference: {project.id}</p></div>
        <span className="font-semibold">{project.quoteStatus || 'quote-sent'}</span>
      </div>
      <p className="mt-3"><strong>Service/output:</strong> {quote.outputType || 'Document preparation'}</p>
      <div className="mt-3 space-y-1 border-t border-emerald-200 pt-3">
        {(quote.clientLineItems || []).map((item, index) => (
          <p key={`${item.label}-${index}`} className="flex justify-between gap-3"><span>{item.label}</span><span>{money(Number(item.amount || 0))}</span></p>
        ))}
        <p className="flex justify-between gap-3"><span>Subtotal</span><strong>{money(Number(quote.subtotal || 0))}</strong></p>
        <p className="flex justify-between gap-3"><span>Tax</span><strong>{money(Number(quote.taxAmount || 0))}</strong></p>
        <p className="flex justify-between gap-3 text-base"><span>Total</span><strong>{money(total)}</strong></p>
      </div>
      {quote.clientNotes && <p className="mt-3 whitespace-pre-wrap"><strong>Quote notes:</strong> {quote.clientNotes}</p>}
      {quote.expiresAt && <p className="mt-2"><strong>Quote expires:</strong> {quote.expiresAt}</p>}
      {!isAdmin && project.quoteStatus === 'quote-sent' && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button disabled={busy} onClick={() => respond('accept')} className="bg-[#003366] text-white hover:bg-[#002244]">Accept quote</Button>
          <Button disabled={busy} variant="outline" onClick={() => respond('decline')}>Decline quote</Button>
        </div>
      )}
      {project.quoteStatus === 'quote-accepted' && total === 0 && (
        <p className="mt-3 font-medium">No payment is due for this approved courtesy quote.</p>
      )}
      {!isAdmin && project.paymentStatus === 'requested' && project.stripeCheckoutUrl && (
        <Button asChild className="mt-4 bg-[#003366] text-white hover:bg-[#002244]"><a href={project.stripeCheckoutUrl}>Pay securely</a></Button>
      )}
      {project.paymentStatus === 'paid' && <p className="mt-3 font-medium">Payment received.</p>}
      {project.quoteStatus === 'quote-declined' && <p className="mt-3 font-medium">You declined this quote. Contact Talk to Text Canada if you would like a revised quote.</p>}
    </div>
  );
}

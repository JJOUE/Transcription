'use client';

import { useState } from 'react';
import { CreditCard, Gift, History, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { TranscriptionJob } from '@/lib/firebase/transcriptions';

type AuditEvent = { id: string; event?: string; timestamp?: { _seconds?: number; seconds?: number }; actorUid?: string };

export function DocumentWorkspacePaymentControls({ job, onSaved }: { job: TranscriptionJob; onSaved: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState<AuditEvent[] | null>(null);
  const total = Number(job.acceptedQuoteSnapshot?.total ?? job.officeQuote?.total ?? 0);

  const post = async (path: string, body: object) => {
    if (!user) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Action failed');
      toast({ title: 'Project updated', description: 'The Document Workspace workflow has been updated.' });
      onSaved();
    } catch (error) {
      toast({ title: 'Action failed', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  const loadAudit = async () => {
    if (!user || !job.id) return;
    setBusy(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/admin/document-workspace/${job.id}/audit`, { headers: { Authorization: `Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Audit history could not be loaded');
      setAudit(result.events || []);
    } catch (error) {
      toast({ title: 'Audit unavailable', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
    } finally { setBusy(false); }
  };

  if (!job.id || !job.officeQuote) return null;
  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="grid gap-2 sm:grid-cols-3">
        <p><strong>Quote:</strong> {job.quoteStatus || 'quote-sent'}</p>
        <p><strong>Total:</strong> CA${total.toFixed(2)}</p>
        <p><strong>Payment:</strong> {job.paymentStatus || 'pending'}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {job.quoteStatus === 'quote-accepted' && total > 0 && job.paymentStatus !== 'paid' && job.officeCompletedDocumentPath && (
          <Button size="sm" disabled={busy} onClick={() => post(`/api/admin/document-workspace/${job.id}/payment-request`, { action: 'request' })}>
            <CreditCard className="mr-2 h-4 w-4" /> Create Payment Request
          </Button>
        )}
        {job.quoteStatus === 'quote-accepted' && total === 0 && !job.courtesyApprovedAt && job.officeCompletedDocumentPath && (
          <Button size="sm" disabled={busy} onClick={() => post(`/api/admin/document-workspace/${job.id}/payment-request`, { action: 'courtesy' })}>
            <Gift className="mr-2 h-4 w-4" /> Courtesy Approve
          </Button>
        )}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => post(`/api/admin/document-workspace/${job.id}/notifications`, { kind: 'quote-ready' })}>
          <Mail className="mr-2 h-4 w-4" /> Resend Quote Email
        </Button>
        {job.paymentStatus === 'requested' && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => post(`/api/admin/document-workspace/${job.id}/notifications`, { kind: 'payment-requested' })}>Resend Payment Email</Button>
        )}
        {(job.paymentStatus === 'paid' || job.courtesyApprovedAt) && job.officeCompletedDocumentPath && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => post(`/api/admin/document-workspace/${job.id}/notifications`, { kind: 'payment-received-ready' })}>Resend Ready Email</Button>
        )}
        <Button size="sm" variant="outline" disabled={busy} onClick={loadAudit}><History className="mr-2 h-4 w-4" /> View Audit History</Button>
      </div>
      {audit && (
        <div className="mt-3 max-h-48 overflow-auto rounded border bg-white p-3" aria-live="polite">
          {audit.length === 0 ? <p>No workflow events recorded yet.</p> : audit.map(event => (
            <p key={event.id} className="border-b py-1 last:border-0">{event.event || 'Event'} · {event.actorUid || 'system'}</p>
          ))}
        </div>
      )}
    </div>
  );
}

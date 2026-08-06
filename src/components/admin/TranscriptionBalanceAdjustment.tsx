'use client';

import { useMemo, useState } from 'react';
import { UserData } from '@/lib/firebase/auth';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { normalizeUserPackages } from '@/lib/firebase/user-packages';

interface Props { client: UserData; onClose: () => void; onSaved: () => void; }

const reasons = [
  ['refunded-project', 'Refunded project'], ['duplicate-submission', 'Duplicate submission'],
  ['cancelled-project', 'Cancelled project'], ['failed-processing', 'Failed processing'],
  ['courtesy-credit', 'Courtesy credit'], ['manual-correction', 'Manual correction'],
] as const;

export function TranscriptionBalanceAdjustment({ client, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const packages = normalizeUserPackages(client.packages);
  const [balanceType, setBalanceType] = useState<'package' | 'free-trial'>('package');
  const [packageId, setPackageId] = useState(packages[0]?.id || '');
  const [direction, setDirection] = useState<'increase' | 'decrease'>('increase');
  const [amount, setAmount] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [reason, setReason] = useState('');
  const [relatedJobId, setRelatedJobId] = useState('');
  const [relatedPaymentId, setRelatedPaymentId] = useState('');
  const [stripeRefundId, setStripeRefundId] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedPackage = useMemo(() => packages.find(item => item.id === packageId), [packages, packageId]);
  const current = balanceType === 'package' ? Number(selectedPackage?.minutesRemaining || 0) : Number(client.freeTrialMinutes || 0);
  const numericAmount = Number(amount) || 0;
  const result = current + (direction === 'increase' ? numericAmount : -numericAmount);

  const save = async () => {
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const clientId = (client as UserData & { id?: string }).id || client.uid;
      const response = await fetch(`/api/admin/users/${clientId}/transcription-balance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ balanceType, packageId: balanceType === 'package' ? packageId : undefined,
          direction, amount: numericAmount, reasonCode, reason: reason.trim(),
          relatedJobId: relatedJobId.trim() || undefined, relatedPaymentId: relatedPaymentId.trim() || undefined,
          stripeRefundId: stripeRefundId.trim() || undefined }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to save adjustment');
      toast({ title: 'Balance adjusted', description: `Resulting balance: ${body.resultingBalance} minutes. Audit ID: ${body.adjustmentId}` });
      onSaved();
    } catch (error) {
      toast({ title: 'Adjustment failed', description: error instanceof Error ? error.message : 'Unable to save adjustment', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
      <h2 className="text-xl font-semibold text-[#003366]">Adjust transcription balance</h2>
      <p className="text-sm text-gray-600 mt-1">{client.name || 'Unnamed client'} - {client.email}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div><Label>Balance type</Label><Select value={balanceType} onValueChange={v => setBalanceType(v as 'package' | 'free-trial')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="package">Package minutes</SelectItem><SelectItem value="free-trial">AI trial minutes</SelectItem></SelectContent></Select></div>
        {balanceType === 'package' && <div><Label>Package</Label><Select value={packageId} onValueChange={setPackageId}><SelectTrigger><SelectValue placeholder="Select package" /></SelectTrigger><SelectContent>{packages.map(pkg => <SelectItem key={pkg.id} value={pkg.id}>{pkg.name || `${pkg.type} package`} - {pkg.minutesRemaining} min</SelectItem>)}</SelectContent></Select></div>}
        <div><Label>Direction</Label><Select value={direction} onValueChange={v => setDirection(v as 'increase' | 'decrease')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="increase">Increase</SelectItem><SelectItem value="decrease">Decrease</SelectItem></SelectContent></Select></div>
        <div><Label htmlFor="balance-amount">Minutes</Label><Input id="balance-amount" type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></div>
        <div className="sm:col-span-2 bg-gray-50 rounded-lg p-3 text-sm">Current: <strong>{current}</strong> minutes; resulting balance: <strong className={result < 0 ? 'text-red-600' : 'text-[#003366]'}>{result}</strong> minutes</div>
        <div><Label>Reason category</Label><Select value={reasonCode} onValueChange={setReasonCode}><SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger><SelectContent>{reasons.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="balance-job">Related job ID</Label><Input id="balance-job" value={relatedJobId} onChange={e => setRelatedJobId(e.target.value)} /></div>
        <div><Label htmlFor="balance-payment">Payment/session ID</Label><Input id="balance-payment" value={relatedPaymentId} onChange={e => setRelatedPaymentId(e.target.value)} /></div>
        <div><Label htmlFor="balance-refund">Stripe refund ID</Label><Input id="balance-refund" value={stripeRefundId} onChange={e => setStripeRefundId(e.target.value)} placeholder="Optional; prevents duplicate credit" /></div>
        <div className="sm:col-span-2"><Label htmlFor="balance-reason">Required explanation</Label><Textarea id="balance-reason" value={reason} onChange={e => setReason(e.target.value)} rows={3} /></div>
      </div>
      <div className="flex justify-end gap-3 mt-6"><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={save} disabled={saving || !reasonCode || !reason.trim() || numericAmount <= 0 || result < 0 || (balanceType === 'package' && !packageId)}>{saving ? 'Saving...' : 'Save adjustment'}</Button></div>
    </div>
  </div>;
}

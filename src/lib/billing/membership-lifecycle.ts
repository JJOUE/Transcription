export type MembershipEventState = {
  status?: string;
  delinquent?: boolean;
  lastStripeEventCreated?: number;
  lastWebhookEventId?: string;
};

function restrictionRank(status: string, delinquent: boolean) {
  if (delinquent || status === 'payment_failed') return 4;
  if (status === 'canceled' || status === 'unpaid' || status === 'incomplete_expired') return 5;
  if (status !== 'active') return 3;
  return 0;
}

export function shouldApplyMembershipEvent(
  current: MembershipEventState,
  incoming: { eventId: string; eventCreated: number; status: string; delinquent: boolean },
) {
  const lastCreated = Number(current.lastStripeEventCreated || 0);
  if (incoming.eventCreated > lastCreated) return true;
  if (incoming.eventCreated < lastCreated) return false;
  if (current.lastWebhookEventId === incoming.eventId) return true;
  return restrictionRank(incoming.status, incoming.delinquent) >
    restrictionRank(String(current.status || ''), current.delinquent === true);
}

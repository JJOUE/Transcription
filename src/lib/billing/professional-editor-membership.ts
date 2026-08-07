import Stripe from 'stripe';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { shouldApplyMembershipEvent } from '@/lib/billing/membership-lifecycle';

export const PROFESSIONAL_EDITOR_MEMBERSHIP_TYPE = 'professional-editor-membership';

export function professionalEditorPriceId() {
  return process.env.STRIPE_PROFESSIONAL_EDITOR_PRICE_ID?.trim() || null;
}

export function subscriptionHasProfessionalEditorPrice(subscription: Stripe.Subscription) {
  const configured = professionalEditorPriceId();
  return !!configured && subscription.items.data.some(item => item.price.id === configured);
}

function periodEnd(subscription: Stripe.Subscription) {
  const ends = subscription.items.data.map(item => item.current_period_end).filter(Boolean);
  return ends.length ? Timestamp.fromMillis(Math.max(...ends) * 1000) : null;
}

export async function storeProfessionalEditorMembership(
  userId: string,
  subscription: Stripe.Subscription,
  eventId: string,
  eventCreated: number,
  override?: { status: string; delinquent: boolean; paymentFailed: boolean },
) {
  if (!subscriptionHasProfessionalEditorPrice(subscription)) return false;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const priceId = professionalEditorPriceId()!;
  const userRef = adminDb.collection('users').doc(userId);
  return adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(userRef);
    const current = snapshot.data()?.professionalEditorMembership || {};
    const incomingStatus = override?.status || subscription.status;
    const incomingDelinquent = override?.delinquent ?? false;
    if (!shouldApplyMembershipEvent(current, { eventId, eventCreated, status: incomingStatus, delinquent: incomingDelinquent })) return false;
    transaction.set(userRef, { professionalEditorMembership: {
      source: 'stripe_webhook',
      status: incomingStatus,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      currentPeriodEnd: periodEnd(subscription),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      delinquent: incomingDelinquent,
      paymentFailed: override?.paymentFailed ?? false,
      canceledAt: subscription.canceled_at ? Timestamp.fromMillis(subscription.canceled_at * 1000) : null,
      endedAt: subscription.ended_at ? Timestamp.fromMillis(subscription.ended_at * 1000) : null,
      lastWebhookEventId: eventId,
      lastStripeEventCreated: eventCreated,
      lastWebhookUpdate: FieldValue.serverTimestamp(),
    },
    updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return true;
  });
}

export async function resolveMembershipUserId(subscription: Stripe.Subscription) {
  if (subscription.metadata.userId) return subscription.metadata.userId;
  const customerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;
  const query = await adminDb.collection('users')
    .where('professionalEditorMembership.stripeCustomerId', '==', customerId).limit(1).get();
  return query.empty ? null : query.docs[0].id;
}

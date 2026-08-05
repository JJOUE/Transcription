import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';

export type DocumentWorkspaceAuditEvent =
  | 'quote-approved'
  | 'quote-sent'
  | 'quote-accepted'
  | 'quote-declined'
  | 'payment-requested'
  | 'payment-confirmed'
  | 'courtesy-approved'
  | 'completed-file-uploaded'
  | 'completed-file-released'
  | 'email-sent'
  | 'email-failed';

export async function recordDocumentWorkspaceAudit(
  projectId: string,
  event: DocumentWorkspaceAuditEvent,
  actorUid: string,
  details: Record<string, string | number | boolean | null> = {},
) {
  try {
    await adminDb.collection('transcriptions').doc(projectId).collection('auditEvents').add({
      projectId, event, actorUid, details, timestamp: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('[Document Workspace Audit] Failed to record event:', { projectId, event, error });
  }
}

export function publicProjectUrl(projectId: string) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'https://talktotext.ca').replace(/\/$/, '');
  return `${base}/document-workspace/${encodeURIComponent(projectId)}`;
}

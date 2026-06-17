/**
 * Simple email notification for human/hybrid transcriptions
 */
export async function sendSimpleNotification(
  fileName: string,
  mode: 'human' | 'hybrid',
  userEmail: string,
  duration: number // in minutes
): Promise<void> {
  try {
    // Using Resend API (simple and reliable)
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.log('[Email] Resend API key not configured, skipping email');
      return;
    }

    const subject = `New ${mode === 'human' ? 'Human' : 'Hybrid'} Transcription - ${fileName}`;

    const text = `
New ${mode === 'human' ? 'Human' : 'Hybrid'} transcription request:

File: ${fileName}
Duration: ${Math.round(duration)} minutes
Customer: ${userEmail}
Submitted: ${new Date().toLocaleString()}

Please process this transcription.
`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Talk To Text Notifications <onboarding@resend.dev>',
        to: 'jennifer@talktotext.ca',
        subject,
        text,
        reply_to: userEmail,
      }),
    });

    if (response.ok) {
      console.log('[Email] Notification sent to Jennifer');
    } else {
      console.log('[Email] Failed to send:', await response.text());
    }
  } catch (error) {
    console.log('[Email] Error:', error);
    // Don't throw - just log and continue
  }
}

interface DocumentWorkspaceNotificationInput {
  jobId: string;
  clientName?: string;
  clientEmail?: string;
  serviceType?: string;
  originalFilename: string;
  hasWrittenInstructions: boolean;
  hasVoiceInstructions: boolean;
  hasTemplate: boolean;
  rushDelivery?: boolean;
  dueDate?: string;
}

const getOfficeServiceLabel = (serviceType?: string) => {
  switch (serviceType) {
    case 'dictation-cleanup':
      return 'Audio instructions for document preparation';
    case 'copy-typing':
      return 'Copy typing';
    case 'handwriting-transcription':
      return 'Handwriting transcription';
    case 'document-preparation':
      return 'Document preparation';
    default:
      return 'Document Workspace';
  }
};

export async function sendDocumentWorkspaceNotification(
  notification: DocumentWorkspaceNotificationInput
): Promise<void> {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    if (!RESEND_API_KEY) {
      console.log('[Email] Resend API key not configured, skipping Document Workspace notification');
      return;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talktotext.ca';
    const adminQueueUrl = `${appUrl.replace(/\/$/, '')}/admin`;
    const clientEmail = notification.clientEmail || 'Not available';

    const text = `
New Document Workspace project received

Client name: ${notification.clientName || 'Not available'}
Client email: ${clientEmail}
Job/project ID: ${notification.jobId}
Service type: ${getOfficeServiceLabel(notification.serviceType)}
Original filename: ${notification.originalFilename}
Written instructions included: ${notification.hasWrittenInstructions ? 'Yes' : 'No'}
Voice instructions included: ${notification.hasVoiceInstructions ? 'Yes' : 'No'}
Template/reference file included: ${notification.hasTemplate ? 'Yes' : 'No'}
Rush requested: ${notification.rushDelivery ? 'Yes' : 'No'}
Due date: ${notification.dueDate || 'Not set'}

Open the admin dashboard/job queue:
${adminQueueUrl}

Do not reply with confidential file contents. Review uploaded materials inside the secure admin dashboard.
`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Talk To Text Notifications <onboarding@resend.dev>',
        to: 'jennifer@talktotext.ca',
        subject: 'New Document Workspace project received',
        text,
        reply_to: notification.clientEmail,
      }),
    });

    if (response.ok) {
      console.log('[Email] Document Workspace notification sent to Jennifer');
    } else {
      console.log('[Email] Failed to send Document Workspace notification:', await response.text());
    }
  } catch (error) {
    console.log('[Email] Document Workspace notification error:', error);
  }
}

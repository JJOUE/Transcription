/**
 * Contact form submission email — sends to Jennifer, reply-to the sender
 */
const getContactEmailConfig = () => ({
  from: process.env.CONTACT_FROM_EMAIL || 'Talk to Text Canada <onboarding@resend.dev>',
  to: process.env.CONTACT_TO_EMAIL || 'jennifer@talktotext.ca',
});

export async function sendContactMessage(
  name: string,
  email: string,
  subject: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const emailConfig = getContactEmailConfig();

  if (!RESEND_API_KEY) {
    console.log('[Email] Resend API key not configured, skipping contact email');
    return { ok: false, error: 'Email service not configured' };
  }

  const text = `
New contact form submission:

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

Submitted: ${new Date().toLocaleString()}
`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailConfig.from,
        to: emailConfig.to,
        subject: `Contact Form: ${subject}`,
        text,
        reply_to: email,
      }),
    });

    if (response.ok) {
      console.log('[Email] Contact message sent to Jennifer');
      return { ok: true };
    }

    const errText = await response.text();
    console.log('[Email] Failed to send contact message:', errText);
    return { ok: false, error: 'Failed to send message' };
  } catch (error) {
    console.log('[Email] Error sending contact message:', error);
    return { ok: false, error: 'Failed to send message' };
  }
}

interface TranscriptionSubmissionNotificationInput {
  jobId: string;
  clientName?: string;
  clientEmail?: string;
  mode: 'ai' | 'human' | 'hybrid';
  originalFilename: string;
  durationMinutes?: number;
  rushDelivery?: boolean;
}

/**
 * Safe business notification for a client transcription submission.
 */
export async function sendSimpleNotification(
  notification: TranscriptionSubmissionNotificationInput
): Promise<void> {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const emailConfig = getContactEmailConfig();

    if (!RESEND_API_KEY) {
      console.warn('[Email] Resend API key not configured, skipping transcription notification');
      return;
    }

    const serviceLabel = notification.mode === 'ai'
      ? 'AI Transcription'
      : notification.mode === 'hybrid'
        ? 'Hybrid Review'
        : 'Human Transcription';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://talktotext.ca';
    const adminQueueUrl = `${appUrl.replace(/\/$/, '')}/admin`;
    const subject = `New ${serviceLabel} project received`;

    const text = `
New client transcription project received

Client name: ${notification.clientName || 'Not available'}
Client email: ${notification.clientEmail || 'Not available'}
Job/project ID: ${notification.jobId}
Service type: ${serviceLabel}
Original filename: ${notification.originalFilename}
Duration: ${notification.durationMinutes == null ? 'Not available' : `${Math.round(notification.durationMinutes)} minutes`}
Rush requested: ${notification.rushDelivery ? 'Yes' : 'No'}
Submitted: ${new Date().toLocaleString()}

Open the admin dashboard/job queue:
${adminQueueUrl}

Review uploaded materials inside the secure admin dashboard. No client files are attached to this email.
`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailConfig.from,
        to: emailConfig.to,
        subject,
        text,
        ...(notification.clientEmail ? { reply_to: notification.clientEmail } : {}),
      }),
    });

    if (response.ok) {
      console.log('[Email] Transcription submission notification sent');
    } else {
      console.error('[Email] Failed to send transcription notification:', await response.text());
    }
  } catch (error) {
    console.error('[Email] Transcription notification error:', error);
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
    const emailConfig = getContactEmailConfig();

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
        from: emailConfig.from,
        to: emailConfig.to,
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

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
): Promise<{ ok: boolean; error?: string }> {
  try {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const emailConfig = getContactEmailConfig();

    if (!RESEND_API_KEY) {
      console.warn('[Email] Resend API key not configured, skipping transcription notification');
      return { ok: false, error: 'Email service not configured' };
    }

    const serviceLabel = notification.mode === 'ai'
      ? 'AI Transcription'
      : notification.mode === 'hybrid'
        ? 'Hybrid Transcription'
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
      return { ok: true };
    } else {
      const errorBody = await response.text();
      console.error('[Email] Failed to send transcription notification:', errorBody);
      return { ok: false, error: `Resend rejected notification: ${response.status}` };
    }
  } catch (error) {
    console.error('[Email] Transcription notification error:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Notification failed' };
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
  quoteRequired?: boolean;
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

    const subject = notification.quoteRequired
      ? 'New Document Workspace quote request received'
      : 'New Document Workspace project received';
    const text = `
${subject}

Client name: ${notification.clientName || 'Not available'}
Client email: ${clientEmail}
Job/project ID: ${notification.jobId}
Service type: ${getOfficeServiceLabel(notification.serviceType)}
Original filename: ${notification.originalFilename}
Written instructions included: ${notification.hasWrittenInstructions ? 'Yes' : 'No'}
Voice instructions included: ${notification.hasVoiceInstructions ? 'Yes' : 'No'}
Template/reference file included: ${notification.hasTemplate ? 'Yes' : 'No'}
Rush requested: ${notification.rushDelivery ? 'Yes' : 'No'}
Pricing status: ${notification.quoteRequired ? 'Quote required before production' : 'Payment or package confirmed'}
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
        subject,
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

type ProjectTransactionalEmailKind = 'quote-ready' | 'payment-requested' | 'payment-received-ready';

interface ProjectTransactionalEmailInput {
  kind: ProjectTransactionalEmailKind;
  clientEmail: string;
  projectId: string;
  serviceLabel?: string;
  total?: number;
  dashboardUrl: string;
}

export async function sendDocumentWorkspaceClientEmail(
  notification: ProjectTransactionalEmailInput,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'Email service not configured' };

  const config = getContactEmailConfig();
  const businessBcc = process.env.BUSINESS_NOTIFICATION_EMAIL?.trim();
  const bcc = businessBcc && businessBcc.toLowerCase() !== notification.clientEmail.toLowerCase()
    ? businessBcc
    : undefined;
  const copy = {
    'quote-ready': { subject: 'Your project quote is ready', heading: 'Your Document Preparation Services quote is ready to review.' },
    'payment-requested': { subject: 'Payment requested for your project', heading: 'Payment has been requested for your approved Document Preparation Services quote.' },
    'payment-received-ready': {
      subject: 'Your completed project is ready',
      heading: notification.total === 0
        ? 'No payment is required and your completed project is ready.'
        : 'Payment has been received and your completed project is ready.',
    },
  }[notification.kind];
  const text = `${copy.heading}\n\nProject reference: ${notification.projectId}\nService: ${notification.serviceLabel || 'Document Preparation Services'}${notification.total == null ? '' : `\nTotal: CA$${notification.total.toFixed(2)}`}\n\nThis project is managed securely through your Document Workspace. Sign in to review it:\n${notification.dashboardUrl}\n\nNo files are attached to this email.`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.from, to: notification.clientEmail, subject: copy.subject, text, ...(bcc ? { bcc } : {}) }),
    });
    if (!response.ok) {
      console.error('[Email] Document Workspace client notification failed:', response.status, await response.text());
      return { ok: false, error: `Email provider returned ${response.status}` };
    }
    const data = await response.json() as { id?: string };
    return { ok: true, messageId: data.id };
  } catch (error) {
    console.error('[Email] Document Workspace client notification error:', error);
    return { ok: false, error: error instanceof Error ? error.message : 'Email failed' };
  }
}

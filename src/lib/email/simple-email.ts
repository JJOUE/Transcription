/**
 * Contact form submission email — sends to Jennifer, reply-to the sender
 */
export async function sendContactMessage(
  name: string,
  email: string,
  subject: string,
  message: string
): Promise<{ ok: boolean; error?: string }> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

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
        from: 'Talk To Text Contact <onboarding@resend.dev>',
        to: 'jennifer@talktotext.ca',
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
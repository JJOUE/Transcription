import { NextResponse } from 'next/server';
import { z } from 'zod';

const serviceOptions = [
  'AI Transcription',
  'Hybrid Transcription',
  'Human Transcription',
  'Transcript Workspace',
  'Document Workspace',
  'Copy Typing',
  'Handwriting Transcription',
  'Audio Instructions for Document Preparation',
  'Other',
] as const;

const ratingOptions = ['5 stars', '4 stars', '3 stars', '2 stars', '1 star'] as const;

const FeedbackSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Valid email is required').max(200),
  serviceUsed: z.enum(serviceOptions),
  rating: z.enum(ratingOptions),
  message: z.string().trim().min(10, 'Feedback message is required').max(4000),
  contactPermission: z.boolean().default(false),
  publicTestimonialPermission: z.boolean().default(false),
  website: z.string().optional().default(''),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = FeedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please check the feedback form and try again.' },
        { status: 400 }
      );
    }

    const feedback = parsed.data;

    if (feedback.website) {
      return NextResponse.json({ success: true });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.CONTACT_FROM_EMAIL || 'Talk to Text Canada <onboarding@resend.dev>';
    const toEmail = process.env.CONTACT_TO_EMAIL || 'jennifer@talktotext.ca';

    if (!resendApiKey) {
      return NextResponse.json(
        { error: 'Feedback email is not configured yet. Please contact us directly.' },
        { status: 503 }
      );
    }

    const subject = `Private client feedback - ${feedback.serviceUsed} - ${feedback.rating}`;
    const text = `
Private feedback submitted through Talk to Text Canada.

Name: ${feedback.name}
Email: ${feedback.email}
Service used: ${feedback.serviceUsed}
Rating: ${feedback.rating}
Permission to contact: ${feedback.contactPermission ? 'Yes' : 'No'}
May consider as public testimonial: ${feedback.publicTestimonialPermission ? 'Yes' : 'No'}

Feedback:
${feedback.message}

Privacy note shown to client:
Do not include confidential, legal, medical, case-specific, or personal information in the feedback box.
`;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toEmail,
        subject,
        text,
        reply_to: feedback.email,
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Unable to send feedback right now. Please try again later.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Unable to send feedback right now. Please try again later.' },
      { status: 500 }
    );
  }
}

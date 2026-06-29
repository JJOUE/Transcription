import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendContactMessage } from '@/lib/email/simple-email';

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Valid email is required').max(200),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  message: z.string().trim().min(1, 'Message is required').max(5000),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const { name, email, subject, message } = parsed.data;
  const result = await sendContactMessage(name, email, subject, message);

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'Failed to send message' },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}

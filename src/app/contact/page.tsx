import type { Metadata } from 'next';
import { ContactPage } from '@/components/pages/ContactPage';

export const metadata: Metadata = {
  title: 'Contact | Talk to Text Canada',
  description:
    'Contact Talk to Text Canada for transcription, document preparation, copy typing, handwriting transcription, and secure workspace support.',
};

export default function Contact() {
  return <ContactPage />;
}

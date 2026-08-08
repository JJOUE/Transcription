import type { Metadata } from 'next';
import { ContactPage } from '@/components/pages/ContactPage';

export const metadata: Metadata = {
  title: 'Contact | Talk to Text Canada',
  description:
    'Contact Talk to Text Canada about Transcript Workspace, Professional Transcription, Document Preparation Services, and secure workspace support.',
};

export default function Contact() {
  return <ContactPage />;
}

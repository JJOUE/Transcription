import type { Metadata } from 'next';
import { LandingPage } from '@/components/pages/LandingPage';

export const metadata: Metadata = {
  title: 'Talk to Text Canada | Transcription & Document Preparation Services',
  description:
    'Canadian transcription and document preparation services, including AI transcription, human transcription, copy typing, handwriting transcription, and secure document support.',
};

export default function Home() {
  return <LandingPage />;
}

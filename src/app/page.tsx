import type { Metadata } from 'next';
import { LandingPage } from '@/components/pages/LandingPage';

export const metadata: Metadata = {
  title: 'Talk to Text Canada | Transcription & Document Preparation Services',
  description:
    'Canadian self-service AI transcription, professional Hybrid and Human Transcription, and human Document Preparation Services with secure workspace delivery.',
};

export default function Home() {
  return <LandingPage />;
}

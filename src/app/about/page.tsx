import type { Metadata } from 'next';
import { AboutPage } from '@/components/pages/AboutPage';

export const metadata: Metadata = {
  title: 'About | Talk to Text Canada',
  description:
    'Learn about Talk to Text Canada, a Canadian transcription and document preparation service built by an experienced transcriptionist.',
};

export default function About() {
  return <AboutPage />;
}

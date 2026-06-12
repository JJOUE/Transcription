import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LegalTranscriptionContent } from './LegalTranscriptionContent';

export const metadata: Metadata = {
  title: 'Legal Transcription Services Canada | Talk to Text Canada',
  description: 'Professional legal transcription services in Canada for legal hearings, statements, interviews, audio instructions for document preparation, and law office workflows. AI transcription, human review, Canadian English, and secure dashboard delivery available.',
  metadataBase: new URL('https://www.talktotext.ca'),
  openGraph: {
    title: 'Legal Transcription Services Canada | Talk to Text Canada',
    description: 'Professional legal transcription services in Canada for legal hearings, statements, interviews, audio instructions for document preparation, and law office workflows. AI transcription, human review, Canadian English, and secure dashboard delivery available.',
    url: 'https://www.talktotext.ca/legal-transcription',
    type: 'website',
  },
};

export default function LegalTranscriptionPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LegalTranscriptionContent />
      </div>

      <Footer />
    </div>
  );
}

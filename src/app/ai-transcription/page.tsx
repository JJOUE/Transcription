import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AITranscriptionContent } from './AITranscriptionContent';

export const metadata: Metadata = {
  title: 'AI Transcription Services Canada | Talk to Text Canada',
  description: 'Fast AI transcription services in Canada with secure dashboard delivery, editable transcripts, Canadian English support, speaker labels, timestamps, and downloadable PDF, DOCX, SRT, and VTT files.',
  metadataBase: new URL('https://www.talktotext.ca'),
  openGraph: {
    title: 'AI Transcription Services Canada | Talk to Text Canada',
    description: 'Fast AI transcription services in Canada with secure dashboard delivery, editable transcripts, Canadian English support, speaker labels, timestamps, and downloadable PDF, DOCX, SRT, and VTT files.',
    url: 'https://www.talktotext.ca/ai-transcription',
    type: 'website',
  },
};

export default function AITranscriptionPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AITranscriptionContent />
      </div>

      <Footer />
    </div>
  );
}


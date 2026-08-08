import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing | Talk to Text Canada',
  description:
    'Compare Transcript Workspace AI pricing, Professional Hybrid and Human Transcription, and Document Preparation Services.',
};

export default function PricingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

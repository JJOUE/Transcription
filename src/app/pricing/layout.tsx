import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing | Talk to Text Canada',
  description:
    'View pricing for AI transcription, hybrid review, human transcription, and Document Workspace services, including document preparation and custom quote options.',
};

export default function PricingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}

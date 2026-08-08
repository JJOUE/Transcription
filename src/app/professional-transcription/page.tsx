import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle, UserCheck, Users } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProfessionalTranscriptionComparison } from '@/components/pages/ProfessionalTranscriptionComparison';

export const metadata: Metadata = {
  title: 'Professional Transcription Canada | Talk to Text Canada',
  description: 'Choose professionally reviewed Hybrid Transcription or Human Transcription created from the original audio.',
  alternates: { canonical: '/professional-transcription' },
};

const services = [
  {
    id: 'hybrid',
    title: 'Hybrid Transcription',
    description: 'AI-generated first, then reviewed and corrected by a professional transcriptionist.',
    detail: 'A more affordable professional option with human review against the original recording.',
    icon: Users,
    features: ['Professional audio review', 'Speaker and paragraph formatting', 'Proofreading and transcription corrections'],
  },
  {
    id: 'human',
    title: 'Human Transcription',
    description: 'No AI-generated transcript. Your recording is transcribed by a professional transcriptionist from the original audio.',
    detail: 'Human typed, formatted, reviewed against the recording, and proofread.',
    icon: UserCheck,
    features: ['Human transcription from the original audio', 'Speaker and paragraph formatting', 'Professional review and proofreading'],
  },
] as const;

export default function ProfessionalTranscriptionPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="border-b bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 text-center sm:px-6 lg:px-8">
            <p className="mb-3 text-sm font-semibold uppercase text-[#b29dd9]">Professional Transcription</p>
            <h1 className="mb-5 text-4xl font-bold text-[#003366] md:text-5xl">Choose Hybrid or Human Transcription</h1>
            <p className="mx-auto max-w-3xl text-lg text-gray-700">
              Choose Hybrid for a lower-cost professionally reviewed transcript, or Human when you do not want an AI-generated draft.
            </p>
          </div>
        </section>

        <section className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-12 sm:px-6 md:grid-cols-2 lg:px-8">
          {services.map(service => {
            const Icon = service.icon;
            return (
              <article key={service.id} id={service.id} className="flex flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <Icon className="mb-4 h-9 w-9 text-[#72629E]" aria-hidden="true" />
                <h2 className="text-2xl font-bold text-[#003366]">{service.title}</h2>
                <p className="mt-3 text-gray-700">{service.description}</p>
                <p className="mt-3 text-sm text-gray-600">{service.detail}</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-gray-700">
                  {service.features.map(feature => (
                    <li key={feature} className="flex gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-none text-green-600" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={`/upload?mode=${service.id}`} className="mt-8 inline-flex items-center justify-center rounded-md bg-[#003366] px-5 py-3 font-semibold text-white hover:bg-[#00264d]">
                  Choose {service.title}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </section>

        <section className="border-t bg-gray-50">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
            <ProfessionalTranscriptionComparison />
          </div>
        </section>

        <section className="border-t bg-white">
          <div className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6">
            <p className="text-gray-700">Want to create and edit an AI transcript yourself?</p>
            <Link href="/transcript-workspace" className="mt-3 inline-flex font-semibold text-[#003366] underline underline-offset-4">Explore Transcript Workspace</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

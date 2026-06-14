import type { Metadata } from 'next';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FeedbackForm } from './FeedbackForm';

export const metadata: Metadata = {
  title: 'Share Feedback | Talk to Text Canada',
  description:
    'Send private feedback to Talk to Text Canada about transcription, Transcript Workspace, Document Workspace, copy typing, handwriting transcription, or document preparation services.',
};

export default function FeedbackPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main>
        <section
          className="relative py-20 text-white"
          style={{
            backgroundImage: "url('/bg_1.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#003366]/85 to-[#2c3e50]/85" />
          <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#b29dd9]">
              Private feedback
            </p>
            <h1 className="mb-6 text-4xl font-bold md:text-5xl">Share Your Feedback</h1>
            <p className="mx-auto max-w-3xl text-lg text-gray-200">
              Tell us about your experience with Talk to Text Canada. Feedback is reviewed before
              any public use, and submitting feedback does not automatically publish it.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 rounded-lg border border-blue-100 bg-blue-50 p-5 text-sm text-gray-700">
              <p>
                This form is for general private feedback only. Please do not include confidential,
                legal, medical, case-specific, or personal information in the feedback box. Talk to
                Text Canada may contact you if follow-up is needed.
              </p>
            </div>

            <FeedbackForm />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

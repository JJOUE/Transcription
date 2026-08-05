import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { GuidedProjectIntake } from '@/components/intake/GuidedProjectIntake';

export const metadata: Metadata = {
  title: 'Start a Project | Talk to Text Canada',
  description: 'Use the guided intake to choose a transcription or document-preparation service before continuing to the secure project form.',
};

export default function StartProjectPage() {
  return (
    <div className="min-h-screen bg-[#f7f4fb]">
      <Header />
      <main className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto mb-9 max-w-3xl text-center">
          <h1 className="text-4xl font-bold text-[#003366]">Your words, professionally prepared.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-700">Tell us what you need, and we will guide you through the right service.</p>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-600">Do not include confidential details on this public page. Files upload securely only after you sign in and continue to the standard form.</p>
        </div>
        <Suspense fallback={<div className="mx-auto max-w-3xl rounded-md bg-white p-8 text-center text-gray-600">Loading guided intake...</div>}>
          <GuidedProjectIntake />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

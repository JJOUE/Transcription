import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Confidentiality & Secure File Handling | Talk to Text Canada',
  description:
    'Learn how Talk to Text Canada handles client confidentiality, secure dashboard uploads, file retention, and confidentiality agreements where applicable.',
};

const sections = [
  {
    title: 'Confidentiality matters',
    body:
      'Talk to Text Canada handles client files, transcripts, documents, notes, and instructions with care. Client confidentiality requirements are respected, including confidentiality agreements where applicable.',
  },
  {
    title: 'Secure upload and download',
    body:
      'Clients are encouraged to upload and download files through their secure client dashboard. Files should not be sent through social media or public messaging platforms.',
  },
  {
    title: 'Confidentiality agreements',
    body:
      'If your organization requires a confidentiality agreement or non-disclosure agreement before work begins, you may contact Talk to Text Canada before submitting your project.',
  },
  {
    title: 'File access',
    body:
      'Project files are used only for the purpose of completing the requested transcription or document-preparation service.',
  },
  {
    title: 'Retention and deletion requests',
    body:
      'Completed files are available through the dashboard for a limited period. Clients may request file deletion from their project page, and deletion requests are reviewed according to the file retention policy.',
  },
  {
    title: 'Important service note',
    body:
      'Talk to Text Canada does not provide legal advice, legal representation, or certified court reporting.',
  },
];

export default function ConfidentialityPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <p className="text-sm font-semibold text-[#72629E] uppercase tracking-wide mb-3">
              Client trust
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-[#003366] mb-5">
              Confidentiality & Secure File Handling
            </h1>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Learn how Talk to Text Canada approaches client confidentiality, secure dashboard file
              handling, retention, and confidentiality agreements where applicable.
            </p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section) => (
              <article key={section.title} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-semibold text-[#003366] mb-3">{section.title}</h2>
                <p className="text-gray-700 leading-relaxed">{section.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 bg-[#f0ebf8] rounded-lg border border-[#e2d8f0] p-6 md:p-8 text-center">
            <h2 className="text-2xl font-bold text-[#003366] mb-3">
              Need a confidentiality agreement reviewed before you submit?
            </h2>
            <p className="text-gray-700 max-w-3xl mx-auto mb-6">
              Contact Talk to Text Canada before uploading files if your organization has specific
              confidentiality requirements or needs to discuss a non-disclosure agreement.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-[#003366] hover:bg-[#002244] text-white">
                <Link href="/contact">Contact Us</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#003366] text-[#003366] hover:bg-white">
                <Link href="/signup">Create Secure Account</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#003366] text-[#003366] hover:bg-white">
                <Link href="/terms">View Terms</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

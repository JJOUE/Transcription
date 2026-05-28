import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Document Workspace for Legal Dictation & Office Services | Talk to Text Canada',
  description:
    'Document Workspace by Talk to Text Canada helps professionals turn dictation, instructions, audio notes, templates, and document requests into polished letters, case notes, reports, correspondence, and professional documents.',
  metadataBase: new URL('https://www.talktotext.ca'),
  openGraph: {
    title: 'Document Workspace for Legal Dictation & Office Services | Talk to Text Canada',
    description:
      'Turn dictation, instructions, audio notes, templates, and document requests into polished letters, case notes, reports, correspondence, and professional documents.',
    url: 'https://www.talktotext.ca/document-workspace',
    type: 'website',
  },
};

const services = [
  {
    title: 'Dictation to Documents',
    text: 'Upload dictation or voice notes and receive polished documents prepared for professional office use.',
  },
  {
    title: 'Letters & Correspondence',
    text: 'Turn instructions, recordings, or rough notes into clear letters, correspondence, and client-ready documents.',
  },
  {
    title: 'Case Notes & Summaries',
    text: 'Convert spoken notes and file instructions into organized case notes, summaries, and internal documents.',
  },
  {
    title: 'Templates & Letterhead',
    text: 'Use your own templates, letterhead, formatting instructions, or document samples to guide the finished work.',
  },
  {
    title: 'Reports & Office Documents',
    text: 'Prepare reports, memos, meeting notes, and professional documents from audio, notes, or written instructions.',
  },
  {
    title: 'Completed Document Delivery',
    text: 'Finished documents can be returned through your secure client workspace for review and download.',
  },
];

const workflow = [
  'Upload dictation, audio notes, written instructions, or a template.',
  'Add formatting notes, document type, deadline, and any special instructions.',
  'The document is prepared using professional transcription and office-document experience.',
  'You review the completed document in your client workspace.',
  'Download your finished document when it is ready.',
];

const safeguards = [
  'Canadian English',
  'Professional formatting',
  'Human document preparation',
  'Secure dashboard delivery',
  'Client templates supported',
  'Completed document downloads',
];

export default function DocumentWorkspacePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <p className="text-sm font-semibold text-[#b29dd9] uppercase tracking-wide mb-3">
              Document Workspace
            </p>

            <h1 className="text-4xl md:text-5xl font-bold text-[#003366] mb-6">
              Document Workspace for Legal Dictation & Office Services
            </h1>

            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-8">
              Turn dictation, instructions, audio notes, templates, and document requests into
              polished letters, case notes, reports, correspondence, and professional documents.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/legal-intake"
                className="inline-flex items-center justify-center rounded-md bg-[#003366] px-6 py-3 text-white font-semibold hover:bg-[#00264d]"
              >
                Start a Document Request
              </Link>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-md border border-[#003366] px-6 py-3 text-[#003366] font-semibold hover:bg-[#003366] hover:text-white"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-2xl bg-gradient-to-r from-[#003366] to-[#b29dd9] text-white p-8 mb-12">
            <h2 className="text-2xl font-bold mb-3">
              Built for Professionals Who Need More Than a Transcript
            </h2>
            <p className="text-white/90">
              Document Workspace is for clients who need help turning spoken instructions, notes,
              dictation, and templates into finished documents. It is designed for professional
              workflows where clarity, formatting, confidentiality, and human judgment matter.
            </p>
          </div>

          <h2 className="text-3xl font-bold text-[#003366] text-center mb-8">
            What Document Workspace Can Help With
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {services.map((service) => (
              <div key={service.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-[#b29dd9]/20 flex items-center justify-center mb-4">
                  <span className="text-[#003366] font-bold">✓</span>
                </div>
                <h3 className="font-semibold text-[#003366] mb-2">{service.title}</h3>
                <p className="text-gray-700 text-sm">{service.text}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-12">
            <h2 className="text-3xl font-bold text-[#003366] mb-6">
              How It Works
            </h2>

            <div className="grid md:grid-cols-5 gap-4">
              {workflow.map((step, index) => (
                <div key={step} className="rounded-xl bg-gray-50 p-4">
                  <div className="text-[#b29dd9] font-bold text-lg mb-2">{index + 1}</div>
                  <p className="text-gray-700 text-sm">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#003366] mb-4">
                For Legal and Professional Office Workflows
              </h2>
              <p className="text-gray-700">
                Document Workspace supports legal dictation, office correspondence, file notes,
                document instructions, and professional drafting support. It is not a legal advice
                service and does not replace a lawyer, licensed representative, or certified court
                reporter.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#003366] mb-4">
                Human Judgment Where It Matters
              </h2>
              <p className="text-gray-700">
                Unlike basic AI transcription, this service is designed for finished document
                preparation. Templates, formatting notes, client instructions, and document purpose
                can guide how the final document is prepared.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-8 mb-12">
            <h2 className="text-2xl font-bold text-[#003366] mb-4">
              Quality, Security & Document Control
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {safeguards.map((item) => (
                <div key={item} className="bg-white rounded-lg border border-blue-100 p-4">
                  <p className="text-gray-800 font-medium">✓ {item}</p>
                </div>
              ))}
            </div>

            <p className="text-gray-700 mt-6">
              Completed documents can be delivered through your client workspace so you can review,
              download, and keep your own copies. Custom formatting, rush work, and complex document
              requests may require a custom quote.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-12">
            <h2 className="text-3xl font-bold text-[#003366] mb-6">
              Frequently Asked Questions
            </h2>

            <div className="space-y-5">
              <div className="border-b border-gray-200 pb-5">
                <h3 className="font-semibold text-[#003366] mb-2">
                  Is Document Workspace the same as transcription?
                </h3>
                <p className="text-gray-700 text-sm">
                  No. Transcription turns audio into text. Document Workspace goes further by helping
                  turn dictation, instructions, notes, and templates into finished professional
                  documents.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-5">
                <h3 className="font-semibold text-[#003366] mb-2">
                  Can I upload my own template or letterhead?
                </h3>
                <p className="text-gray-700 text-sm">
                  Yes. You can provide templates, letterhead, samples, or formatting instructions to
                  guide the finished document.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-5">
                <h3 className="font-semibold text-[#003366] mb-2">
                  Does this service provide legal advice?
                </h3>
                <p className="text-gray-700 text-sm">
                  No. Talk to Text Canada provides transcription, dictation, formatting, and document
                  preparation support. We do not provide legal advice, legal representation, or
                  certified court reporting.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-5">
                <h3 className="font-semibold text-[#003366] mb-2">
                  What kinds of documents can be prepared?
                </h3>
                <p className="text-gray-700 text-sm">
                  Examples include letters, correspondence, case notes, file summaries, reports,
                  office documents, meeting notes, and documents based on client instructions.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#003366] mb-2">
                  Is rush service available?
                </h3>
                <p className="text-gray-700 text-sm">
                  Rush service may be available depending on document length, complexity, and current
                  workload. Larger or complex requests may require a custom quote.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-[#003366] to-[#b29dd9] text-white p-8 text-center">
            <h2 className="text-3xl font-bold mb-3">
              Need More Than a Transcript?
            </h2>
            <p className="text-white/90 mb-6">
              Use Document Workspace to turn dictation, instructions, and templates into professional
              documents prepared for real office workflows.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/legal-intake"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-[#003366] font-semibold hover:bg-gray-100"
              >
                Start a Document Request
              </Link>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-md border border-white px-6 py-3 text-white font-semibold hover:bg-white hover:text-[#003366]"
              >
                View Pricing
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-md border border-white px-6 py-3 text-white font-semibold hover:bg-white hover:text-[#003366]"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

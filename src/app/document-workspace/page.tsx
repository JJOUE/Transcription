import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Document Workspace | Talk to Text Canada',
  description:
    'Document preparation support from audio instructions, notes, scanned documents, handwriting, audio, video, and typed drafts, with completed document download through Talk to Text Canada.',
  metadataBase: new URL('https://www.talktotext.ca'),
  openGraph: {
    title: 'Document Workspace | Talk to Text Canada',
    description:
      'Document preparation support from audio instructions, notes, scanned documents, handwriting, audio, video, and typed drafts, with completed document download through Talk to Text Canada.',
    url: 'https://www.talktotext.ca/document-workspace',
    type: 'website',
  },
};

const features = [
  {
    title: 'Audio Instructions and Reference Files',
    text: 'Upload audio instructions when you want Talk to Text Canada to prepare a document based on what you explain in the recording.',
  },
  {
    title: 'Copy Typing',
    text: 'Send scanned documents, PDFs, images, or typed drafts to be recreated as clean editable documents.',
  },
  {
    title: 'Handwriting Transcription',
    text: 'Handwritten notes, letters, file notes, and forms can be typed into readable digital documents.',
  },
  {
    title: 'Notes and Instructions',
    text: 'Add formatting notes, project details, special instructions, and supporting context.',
  },
  {
    title: 'Human-Prepared Documents',
    text: 'Document Workspace is built around practical preparation, formatting, and review support.',
  },
  {
    title: 'Completed Document Download',
    text: 'When the completed document is uploaded, clients can download it from their dashboard.',
  },
];

const workflow = [
  'Sign in or contact us to start a document project.',
  'Upload audio instructions, notes, scanned documents, handwritten pages, audio, video, or typed drafts.',
  'We prepare, type, clean up, or format the document according to the service requested.',
  'Review project status in your dashboard.',
  'Download the completed document when it is ready.',
];

const usageSteps = [
  {
    title: 'Create your account',
    text: 'Sign in or create an account to access your secure workspace.',
  },
  {
    title: 'Start a Document Workspace project',
    text: 'Choose Document Workspace and select the type of support you need: audio instructions for document preparation, copy typing, handwriting transcription, or document preparation from notes or files.',
  },
  {
    title: 'Upload your file',
    text: 'Upload your audio instructions, document, scan, handwriting image, PDF, typed draft, or other supported source file.',
  },
  {
    title: 'Add helpful instructions',
    text: 'Tell us what you need prepared, cleaned up, typed, formatted, or organized. You can also include names, spellings, preferred formatting, or special instructions.',
  },
  {
    title: 'Add a template or reference file if needed',
    text: 'If you have a template, sample, letterhead, form, or reference document, upload it as an optional reference file.',
  },
  {
    title: 'Submit your project',
    text: 'Review your project details and submit your request through the secure workspace.',
  },
  {
    title: 'Human preparation',
    text: 'Your project is reviewed and prepared according to the instructions provided. Talk to Text Canada provides document preparation support, not legal advice or legal representation.',
  },
  {
    title: 'Download your completed document',
    text: 'When your completed document is ready, you can download it from your dashboard.',
  },
  {
    title: 'Download before retention ends',
    text: 'Completed files remain active for 30 days, may be archived after 30 days, and may be deleted after 90 days unless a retention hold applies. Download anything you need before the deletion date shown in your dashboard.',
  },
];

const safeguards = [
  'Canadian English',
  'Professional formatting',
  'Document preparation',
  'Copy typing',
  'Handwriting transcription',
  'Secure dashboard delivery',
  'Completed document download',
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
              Document Workspace
            </h1>

            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-6">
              Turn audio instructions, notes, templates, and reference files into organized, editable documents.
            </p>
            <p className="text-sm text-gray-500 max-w-3xl mx-auto mb-8">
              Document Workspace helps professionals turn audio instructions, notes, scanned documents, handwritten pages, transcripts, and typed drafts into clean, downloadable documents. If you only need audio or video converted into text, use AI Transcription instead.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signin"
                className="inline-flex items-center justify-center rounded-md bg-[#003366] px-6 py-3 text-white font-semibold hover:bg-[#00264d]"
              >
                Start a Document Project
              </Link>

              <Link
                href="/pricing#document-workspace"
                className="inline-flex items-center justify-center rounded-md border border-[#003366] px-6 py-3 text-[#003366] font-semibold hover:bg-[#003366] hover:text-white"
              >
                View Pricing
              </Link>

              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-md border border-[#003366] px-6 py-3 text-[#003366] font-semibold hover:bg-[#003366] hover:text-white"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="rounded-2xl bg-[#003366] text-white p-8 mb-12">
            <h2 className="text-2xl font-bold mb-3">
              See how Document Workspace works
            </h2>
            <div className="mt-6 rounded-xl border border-white/30 bg-white/10 p-8 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/40">
                <span className="text-2xl font-bold">▶</span>
              </div>
              <p className="text-white/90 max-w-2xl mx-auto">
                A short walkthrough video will appear here showing how clients start a document
                project, upload audio instructions, notes, scans, handwriting, or drafts, track status, and
                download a completed document when ready.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-[#003366] mb-3">
                How to use Document Workspace
              </h2>
              <p className="text-gray-700 max-w-2xl mx-auto">
                Use Document Workspace to submit audio instructions for document preparation, copy
                typing, handwriting transcription, or document preparation from notes or files.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {usageSteps.map((step, index) => (
                <div key={step.title} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#b29dd9]/20 text-sm font-bold text-[#003366]">
                    {index + 1}
                  </div>
                  <h3 className="font-semibold text-[#003366] mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-700">{step.text}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-600 mt-6 text-center">
              Non-audio document, scan, handwriting, and copy typing projects may require a custom
              quote depending on length, clarity, formatting, and complexity.
            </p>
          </div>

          <h2 className="text-3xl font-bold text-[#003366] text-center mb-8">
            Current Features
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-[#b29dd9]/20 flex items-center justify-center mb-4">
                  <span className="text-[#003366] font-bold">✓</span>
                </div>
                <h3 className="font-semibold text-[#003366] mb-2">{feature.title}</h3>
                <p className="text-gray-700 text-sm">{feature.text}</p>
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
                Important Note
              </h2>
              <p className="text-gray-700">
                Talk to Text Canada provides transcription, copy typing, formatting, and document
                preparation support. We do not provide legal advice, legal representation, or
                certified court reporting services. Clients are responsible for reviewing and
                approving all final documents before use.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#003366] mb-4">
                What Clients Can Provide
              </h2>
              <p className="text-gray-700">
                You can provide audio instructions, notes, scanned documents, handwritten pages, audio,
                video, typed drafts, formatting preferences, and your own template file where
                applicable.
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
              Completed documents can be delivered through your client workspace so you can
              download and keep your own copies. Editable document delivery, including DOCX where
              applicable, is intended for prepared document projects. Custom formatting, rush work,
              and complex requests may require a custom quote.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm mb-12">
            <h2 className="text-2xl font-bold text-[#003366] mb-4">
              File Retention
            </h2>
            <p className="text-gray-700">
              Files remain active in your dashboard for 30 days after completion. After 30 days,
              files may be archived. Archived files remain available until the 90-day retention
              period ends. After 90 days, audio files, transcript files, completed documents, and
              related downloads may be permanently deleted unless a retention hold has been
              applied. Please download anything you need before the deletion date.
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
                  No. Transcription turns audio into text. Document Workspace supports document
                  preparation from audio instructions, notes, scanned documents, handwriting, typed
                  drafts, and reference files.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-5">
                <h3 className="font-semibold text-[#003366] mb-2">
                  Can I upload my own template or letterhead?
                </h3>
                <p className="text-gray-700 text-sm">
                  Yes. Signed-in clients can upload a template file or formatting reference where it
                  applies to the project.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-5">
                <h3 className="font-semibold text-[#003366] mb-2">
                  Does this service provide legal advice?
                </h3>
                <p className="text-gray-700 text-sm">
                  No. Talk to Text Canada provides transcription, copy typing, formatting, and
                  document preparation support. We do not provide legal advice, legal
                  representation, or certified court reporting services.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-5">
                <h3 className="font-semibold text-[#003366] mb-2">
                  What kinds of documents can be prepared?
                </h3>
                <p className="text-gray-700 text-sm">
                  Examples may include letters, correspondence, notes, reports, memos, typed drafts,
                  copy typing projects, meeting notes, and documents based on client instructions.
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
              Ready to Start a Document Project?
            </h2>
            <p className="text-white/90 mb-6">
              Sign in to use the protected workspace, review pricing, or contact us about a
              document preparation project.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signin"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-[#003366] font-semibold hover:bg-gray-100"
              >
                Sign In
              </Link>

              <Link
                href="/pricing#document-workspace"
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

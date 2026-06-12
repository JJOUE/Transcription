import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle,
  Clock,
  Contact,
  CreditCard,
  Download,
  FileText,
  HelpCircle,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Guide | Talk to Text Canada',
  description:
    'A beginner-friendly guide to using Talk to Text Canada for transcription, Transcript Workspace, Document Workspace, uploads, pricing, retention, and downloads.',
  metadataBase: new URL('https://www.talktotext.ca'),
  openGraph: {
    title: 'Guide | Talk to Text Canada',
    description:
      'Learn how to use Talk to Text Canada for transcription, dictation cleanup, copy typing, handwriting transcription, document preparation, and secure downloads.',
    url: 'https://www.talktotext.ca/guide',
    type: 'website',
  },
};

const transcriptSteps = [
  'Upload your audio or video through your secure workspace.',
  'Choose AI, Hybrid, or Human transcription where those options are available.',
  'Add the expected speaker count and any project dictionary terms, such as names, places, organizations, acronyms, or preferred spellings.',
  'Select saved client dictionary terms if you want to reuse private terms from past jobs.',
  'Open the completed transcript from your dashboard when it is ready.',
  'Use Edit Transcript to correct text, rename speakers, adjust speaker labels, and review paragraph blocks.',
  'Use cleanup tools for filler words, duplicate words, formatting, and timestamp display options without rewriting the transcript meaning.',
  'Click Save Transcript before downloading, leaving, or closing the workspace.',
  'Download your completed transcript in the format you need.',
];

const documentSteps = [
  'Choose Document Workspace for dictation cleanup, copy typing, handwriting transcription, or document preparation.',
  'Upload audio, video, documents, scans, handwriting images, PDFs, TXT, DOC, DOCX, JPG, PNG, or HEIC files where supported.',
  'Add instructions describing what should be prepared, typed, cleaned up, formatted, or organized.',
  'Upload an optional template, sample, letterhead, form, or reference document if it helps explain the format you need.',
  'Submit the project through your secure workspace.',
  'Track the project from your dashboard.',
  'Download the completed document from your dashboard when it is ready.',
];

const uploadNotes = [
  'Use the secure workspace to upload files and manage completed work.',
  'Only include the files and information needed for the project.',
  'Avoid including unnecessary sensitive details where they are not required for the service.',
  'Uploaded files, transcript files, completed documents, and downloads are accessed through your dashboard.',
];

const pricingNotes = [
  'Transcription pricing depends on the service type selected.',
  'Document Workspace projects involving documents, scans, handwriting, or copy typing may require a custom quote.',
  'Check the Pricing page for current rates and available service options.',
];

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <p className="text-sm font-semibold text-[#b29dd9] uppercase tracking-wide mb-3">
              Client Guide
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-[#003366] mb-6">
              How to Use Talk to Text Canada
            </h1>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-8">
              A simple guide to uploading files, using Transcript Workspace and Document Workspace,
              saving your work, and downloading completed transcripts or documents.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signin"
                className="inline-flex items-center justify-center rounded-md bg-[#003366] px-6 py-3 font-semibold text-white hover:bg-[#00264d]"
              >
                Sign In
              </Link>
              <Link
                href="/transcript-workspace"
                className="inline-flex items-center justify-center rounded-md border border-[#003366] px-6 py-3 font-semibold text-[#003366] hover:bg-[#003366] hover:text-white"
              >
                Transcript Workspace
              </Link>
              <Link
                href="/document-workspace"
                className="inline-flex items-center justify-center rounded-md border border-[#003366] px-6 py-3 font-semibold text-[#003366] hover:bg-[#003366] hover:text-white"
              >
                Document Workspace
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <BookOpen className="mb-4 h-8 w-8 text-[#b29dd9]" />
              <h2 className="text-2xl font-bold text-[#003366] mb-3">
                What You Can Use This Service For
              </h2>
              <p className="text-gray-700 mb-4">
                Talk to Text Canada provides Canadian transcription, dictation cleanup, copy typing,
                handwriting transcription, formatting, and document preparation support for
                professionals.
              </p>
              <p className="text-gray-700">
                You can upload audio, video, notes, scans, handwriting, PDFs, typed drafts, and
                related reference files depending on the service you need.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <ShieldCheck className="mb-4 h-8 w-8 text-[#b29dd9]" />
              <h2 className="text-2xl font-bold text-[#003366] mb-3">
                Important Service Note
              </h2>
              <p className="text-gray-700">
                Talk to Text Canada does not provide legal advice, legal representation, or
                certified court reporting. Clients are responsible for reviewing and approving all
                final transcripts and documents before use.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm mb-12">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-[#003366] mb-3">
                  Transcript Workspace
                </h2>
                <p className="text-gray-700 max-w-3xl">
                  Transcript Workspace is where completed transcripts can be opened, reviewed,
                  corrected, saved, and downloaded.
                </p>
              </div>
              <Link
                href="/transcript-workspace"
                className="inline-flex items-center justify-center rounded-md border border-[#003366] px-5 py-2 font-semibold text-[#003366] hover:bg-[#003366] hover:text-white"
              >
                Learn More
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {transcriptSteps.map((step, index) => (
                <div key={step} className="rounded-xl bg-gray-50 border border-gray-200 p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#b29dd9]/20 text-sm font-bold text-[#003366]">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm mb-12">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold text-[#003366] mb-3">
                  Document Workspace
                </h2>
                <p className="text-gray-700 max-w-3xl">
                  Document Workspace is for dictation cleanup, copy typing, handwriting
                  transcription, and document preparation projects.
                </p>
              </div>
              <Link
                href="/document-workspace"
                className="inline-flex items-center justify-center rounded-md border border-[#003366] px-5 py-2 font-semibold text-[#003366] hover:bg-[#003366] hover:text-white"
              >
                Learn More
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {documentSteps.map((step, index) => (
                <div key={step} className="rounded-xl bg-gray-50 border border-gray-200 p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#b29dd9]/20 text-sm font-bold text-[#003366]">
                    {index + 1}
                  </div>
                  <p className="text-sm text-gray-700">{step}</p>
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-600 mt-6 text-center">
              Non-audio document, scan, handwriting, and copy typing projects may require a custom
              quote depending on length, clarity, formatting, and complexity.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <Upload className="mb-4 h-8 w-8 text-[#b29dd9]" />
              <h2 className="text-2xl font-bold text-[#003366] mb-4">
                Uploads and File Handling
              </h2>
              <ul className="space-y-3">
                {uploadNotes.map((note) => (
                  <li key={note} className="flex gap-3 text-sm text-gray-700">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#003366]" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <CreditCard className="mb-4 h-8 w-8 text-[#b29dd9]" />
              <h2 className="text-2xl font-bold text-[#003366] mb-4">
                Pricing Basics
              </h2>
              <ul className="space-y-3 mb-6">
                {pricingNotes.map((note) => (
                  <li key={note} className="flex gap-3 text-sm text-gray-700">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#003366]" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-md bg-[#003366] px-5 py-2 font-semibold text-white hover:bg-[#00264d]"
              >
                View Pricing
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-8 mb-12">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <Clock className="h-8 w-8 flex-shrink-0 text-[#003366]" />
              <div>
                <h2 className="text-2xl font-bold text-[#003366] mb-3">
                  Retention and Downloads
                </h2>
                <p className="text-gray-700 mb-4">
                  Completed files remain active for 30 days, may be archived after 30 days, and may
                  be deleted after 90 days unless a retention hold applies. Download anything you
                  need before the deletion date shown in your dashboard.
                </p>
                <p className="text-gray-700">
                  Save transcript edits before downloading or leaving Transcript Workspace. Download
                  completed transcripts and documents from your dashboard while they remain
                  available.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-200 p-8 shadow-sm mb-12">
            <h2 className="text-3xl font-bold text-[#003366] mb-6">
              Quick Links
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { href: '/signin', label: 'Sign In', icon: ShieldCheck },
                { href: '/transcript-workspace', label: 'Transcript Workspace', icon: FileText },
                { href: '/document-workspace', label: 'Document Workspace', icon: Upload },
                { href: '/contact', label: 'Contact Us', icon: Contact },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-5 hover:border-[#003366] hover:bg-white"
                  >
                    <Icon className="mb-3 h-6 w-6 text-[#b29dd9]" />
                    <span className="font-semibold text-[#003366]">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-[#003366] to-[#b29dd9] p-8 text-center text-white">
            <Download className="mx-auto mb-4 h-10 w-10 text-white" />
            <h2 className="text-3xl font-bold mb-3">Need Help Choosing a Service?</h2>
            <p className="text-white/90 mb-6">
              Contact us if you are not sure whether your project belongs in Transcript Workspace
              or Document Workspace.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 font-semibold text-[#003366] hover:bg-gray-100"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Contact Us
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

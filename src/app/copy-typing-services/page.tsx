import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle, FileText, ShieldCheck, Upload } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Copy Typing Services Canada | Talk to Text Canada',
  description:
    'Canadian copy typing services for PDFs, scanned documents, typed drafts, notes, and document preparation. Secure upload and professional document support.',
  metadataBase: new URL('https://www.talktotext.ca'),
  openGraph: {
    title: 'Copy Typing Services Canada | Talk to Text Canada',
    description:
      'Canadian copy typing services for PDFs, scanned documents, typed drafts, notes, and document preparation. Secure upload and professional document support.',
    url: 'https://www.talktotext.ca/copy-typing-services',
    type: 'website',
  },
};

const copyTypingUses = [
  {
    title: 'PDFs and scanned documents',
    text: 'Send readable PDFs or scans that need to be typed into an editable document.',
  },
  {
    title: 'Typed drafts that need cleanup',
    text: 'Have existing typed material cleaned up, organized, or prepared in a more usable format.',
  },
  {
    title: 'Notes that need to be typed',
    text: 'Turn notes, rough drafts, and reference material into a clean digital document.',
  },
  {
    title: 'Image-based text',
    text: 'Upload image files with readable text that needs to be typed or prepared.',
  },
  {
    title: 'Reference documents',
    text: 'Provide supporting files, samples, or references to guide the finished document.',
  },
  {
    title: 'Simple formatting',
    text: 'Request clear formatting and document preparation for practical review and download.',
  },
];

const workflowSteps = [
  'Create your account.',
  'Choose Document Workspace.',
  'Select Copy Typing.',
  'Upload your file and instructions.',
  'Download the completed document from your dashboard.',
];

export default function CopyTypingServicesPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <p className="text-sm font-semibold text-[#b29dd9] uppercase tracking-wide mb-3">
              Copy Typing Services
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-[#003366] mb-6">
              Copy Typing Services in Canada
            </h1>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-4">
              Upload your document, scan, PDF, image, or typed draft. Talk to Text Canada types or
              prepares the text into a clean document you can review, save, and download.
            </p>
            <p className="text-sm text-gray-500 max-w-3xl mx-auto mb-8">
              Copy typing is useful for professionals, businesses, academics, students, researchers,
              and individuals who need existing text typed, cleaned up, or prepared in a usable
              document format.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signin"
                className="inline-flex items-center justify-center rounded-md bg-[#003366] px-6 py-3 font-semibold text-white hover:bg-[#00264d]"
              >
                Start a Document Project
              </Link>
              <Link
                href="/pricing#document-workspace"
                className="inline-flex items-center justify-center rounded-md border border-[#003366] px-6 py-3 font-semibold text-[#003366] hover:bg-[#003366] hover:text-white"
              >
                View Pricing
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-md border border-[#003366] px-6 py-3 font-semibold text-[#003366] hover:bg-[#003366] hover:text-white"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr] gap-8 items-start mb-12">
            <div className="rounded-2xl bg-[#003366] text-white p-8">
              <FileText className="h-10 w-10 text-[#b29dd9] mb-4" />
              <h2 className="text-3xl font-bold mb-4">What copy typing means</h2>
              <p className="text-white/90 mb-4">
                Copy typing means typing from existing material, such as PDFs, scanned documents,
                typed drafts, notes, images, or reference files.
              </p>
              <p className="text-white/90">
                If you need a document recreated, cleaned up, or prepared in an editable format,
                Document Workspace can help.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-[#003366] mb-6">
                What copy typing can help with
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {copyTypingUses.map((item) => (
                  <div key={item.title} className="rounded-xl bg-gray-50 border border-gray-200 p-5">
                    <CheckCircle className="h-5 w-5 text-[#b29dd9] mb-3" />
                    <h3 className="font-semibold text-[#003366] mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-700">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm mb-12">
            <h2 className="text-3xl font-bold text-[#003366] mb-8">How it works</h2>
            <div className="grid md:grid-cols-5 gap-4">
              {workflowSteps.map((step, index) => (
                <div key={step} className="rounded-xl bg-gray-50 p-4">
                  <div className="text-[#b29dd9] font-bold text-lg mb-2">{index + 1}</div>
                  <p className="text-sm text-gray-700">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <Upload className="h-8 w-8 text-[#b29dd9] mb-4" />
              <h2 className="text-2xl font-bold text-[#003366] mb-4">
                File quality helps
              </h2>
              <p className="text-gray-700">
                Clear scans, readable PDFs, organized files, and specific instructions help improve
                turnaround time and pricing accuracy. If parts of a file are hard to read, include a
                note so we know what needs extra attention.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <ShieldCheck className="h-8 w-8 text-[#b29dd9] mb-4" />
              <h2 className="text-2xl font-bold text-[#003366] mb-4">
                Pricing note
              </h2>
              <p className="text-gray-700 mb-5">
                Copy typing projects may be quoted after review because pricing depends on file
                quality, length, formatting, turnaround time, and instructions.
              </p>
              <Link
                href="/pricing#document-workspace"
                className="inline-flex items-center justify-center rounded-md bg-[#003366] px-5 py-2 font-semibold text-white hover:bg-[#00264d]"
              >
                View Document Workspace pricing
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-8 mb-12">
            <h2 className="text-2xl font-bold text-[#003366] mb-4">File retention</h2>
            <p className="text-gray-700">
              Completed files remain active for 30 days, may be archived after 30 days, and may be
              deleted after 90 days unless a retention hold applies. Download anything you need
              before the deletion date shown in your dashboard.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm mb-12">
            <h2 className="text-2xl font-bold text-[#003366] mb-4">Service note</h2>
            <p className="text-gray-700">
              Talk to Text Canada provides document preparation and typing support. We do not
              provide legal advice, legal representation, or certified court reporting.
            </p>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-[#003366] to-[#b29dd9] text-white p-8 text-center">
            <h2 className="text-3xl font-bold mb-3">Ready to Start a Copy Typing Project?</h2>
            <p className="text-white/90 mb-6">
              Use Document Workspace to submit your file, instructions, and any reference material.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/document-workspace"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 font-semibold text-[#003366] hover:bg-gray-100"
              >
                Learn About Document Workspace
              </Link>
              <Link
                href="/guide"
                className="inline-flex items-center justify-center rounded-md border border-white px-6 py-3 font-semibold text-white hover:bg-white hover:text-[#003366]"
              >
                Read the Guide
              </Link>
              <Link
                href="/signin"
                className="inline-flex items-center justify-center rounded-md border border-white px-6 py-3 font-semibold text-white hover:bg-white hover:text-[#003366]"
              >
                Start a Document Project
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

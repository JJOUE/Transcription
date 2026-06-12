import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle, FileText, PenLine, ShieldCheck, Upload } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Handwriting Transcription Services Canada | Talk to Text Canada',
  description:
    'Canadian handwriting transcription services for handwritten notes, scans, images, PDFs, and document preparation. Secure upload and professional typing support.',
  metadataBase: new URL('https://www.talktotext.ca'),
  openGraph: {
    title: 'Handwriting Transcription Services Canada | Talk to Text Canada',
    description:
      'Canadian handwriting transcription services for handwritten notes, scans, images, PDFs, and document preparation. Secure upload and professional typing support.',
    url: 'https://www.talktotext.ca/handwriting-transcription',
    type: 'website',
  },
};

const handwritingUses = [
  {
    title: 'Handwritten notes',
    text: 'Turn readable handwritten notes into a clean typed document.',
  },
  {
    title: 'Scanned handwritten pages',
    text: 'Upload scans of handwritten pages that need to be typed and organized.',
  },
  {
    title: 'Image-based handwriting',
    text: 'Send photos or image files with readable handwriting for transcription support.',
  },
  {
    title: 'Handwritten drafts',
    text: 'Have handwritten drafts typed into a more useful document format.',
  },
  {
    title: 'Meeting or research notes',
    text: 'Convert handwritten meeting, study, interview, or research notes into typed text.',
  },
  {
    title: 'Simple formatting',
    text: 'Request clean formatting and document preparation for review and download.',
  },
];

const workflowSteps = [
  'Create your account.',
  'Choose Document Workspace.',
  'Select Handwriting Transcription.',
  'Upload your handwriting file and instructions.',
  'Download the completed typed document from your dashboard.',
];

export default function HandwritingTranscriptionPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <p className="text-sm font-semibold text-[#b29dd9] uppercase tracking-wide mb-3">
              Handwriting Transcription
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-[#003366] mb-6">
              Handwriting Transcription Services in Canada
            </h1>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-4">
              Upload handwritten notes, scans, images, or PDFs. Talk to Text Canada types readable
              handwriting into a clean document you can review, save, and download.
            </p>
            <p className="text-sm text-gray-500 max-w-3xl mx-auto mb-8">
              Handwriting transcription is useful for professionals, businesses, academics,
              researchers, students, and individuals who need handwritten content prepared as typed
              text.
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
              <PenLine className="h-10 w-10 text-[#b29dd9] mb-4" />
              <h2 className="text-3xl font-bold mb-4">What handwriting transcription means</h2>
              <p className="text-white/90 mb-4">
                Handwriting transcription means typing readable handwritten content into a typed
                document.
              </p>
              <p className="text-white/90">
                If you need handwritten notes, scans, images, or PDFs converted into clean typed
                text, Document Workspace can help.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-[#003366] mb-6">
                What handwriting transcription can help with
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {handwritingUses.map((item) => (
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
                Clear images, readable handwriting, good lighting, and organized instructions help
                improve turnaround time and pricing accuracy. If a page is hard to read, include a
                note about what you need typed or clarified.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <ShieldCheck className="h-8 w-8 text-[#b29dd9] mb-4" />
              <h2 className="text-2xl font-bold text-[#003366] mb-4">
                Pricing note
              </h2>
              <p className="text-gray-700 mb-5">
                Handwriting transcription projects may be quoted after review because pricing
                depends on readability, file quality, length, formatting, turnaround time, and
                instructions.
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

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm mb-12">
            <h2 className="text-2xl font-bold text-[#003366] mb-4">Related services</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { href: '/document-workspace', label: 'Document Workspace', icon: FileText },
                { href: '/copy-typing-services', label: 'Copy Typing Services', icon: FileText },
                { href: '/guide', label: 'Client Guide', icon: CheckCircle },
                { href: '/contact', label: 'Contact Us', icon: Upload },
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

          <div className="rounded-2xl bg-gradient-to-r from-[#003366] to-[#b29dd9] text-white p-8 text-center">
            <h2 className="text-3xl font-bold mb-3">
              Ready to Start a Handwriting Transcription Project?
            </h2>
            <p className="text-white/90 mb-6">
              Use Document Workspace to submit your handwriting file, instructions, and any
              reference material.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/document-workspace"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 font-semibold text-[#003366] hover:bg-gray-100"
              >
                Learn About Document Workspace
              </Link>
              <Link
                href="/pricing#document-workspace"
                className="inline-flex items-center justify-center rounded-md border border-white px-6 py-3 font-semibold text-white hover:bg-white hover:text-[#003366]"
              >
                View Pricing
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

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  CheckCircle,
  FileAudio,
  FileText,
  Mic,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Audio Instructions for Document Preparation | Talk to Text Canada',
  description:
    'Upload audio instructions for human document preparation. Talk to Text Canada prepares documents from voice notes, reference files, scans, handwriting, and written instructions.',
  metadataBase: new URL('https://www.talktotext.ca'),
  openGraph: {
    title: 'Audio Instructions for Document Preparation | Talk to Text Canada',
    description:
      'Upload audio instructions for human document preparation. Talk to Text Canada prepares documents from voice notes, reference files, scans, handwriting, and written instructions.',
    url: 'https://www.talktotext.ca/audio-instructions-document-preparation',
    type: 'website',
  },
};

const useCases = [
  {
    title: 'Dictated letters',
    text: 'Upload a recording that explains the letter you need prepared.',
  },
  {
    title: 'Professional notes',
    text: 'Turn spoken instructions, notes, and references into an organized working document.',
  },
  {
    title: 'Case or file summaries',
    text: 'Request document preparation support based on the information you provide, without legal analysis or legal advice.',
  },
  {
    title: 'Document drafts from voice notes',
    text: 'Use voice notes to explain the structure, wording, and details you want included.',
  },
  {
    title: 'Formatting instructions',
    text: 'Describe the layout, headings, tone, or formatting you want in the completed document.',
  },
  {
    title: 'Audio and reference files',
    text: 'Combine audio instructions with scans, handwriting, templates, notes, or uploaded documents.',
  },
  {
    title: 'Typed notes from spoken instructions',
    text: 'Have spoken instructions prepared into readable typed notes for review.',
  },
];

const workflowSteps = [
  'Create your account.',
  'Choose Document Workspace.',
  'Select Audio instructions for document preparation.',
  'Upload your audio instructions and any reference files.',
  'Download your completed document from your dashboard.',
];

export default function AudioInstructionsDocumentPreparationPage() {
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
              Audio Instructions for Document Preparation
            </h1>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-4">
              Upload a recording explaining what document you need, then add notes, files, scans,
              handwriting, templates, or reference documents to guide the work.
            </p>
            <p className="text-sm text-gray-500 max-w-3xl mx-auto mb-8">
              Talk to Text Canada prepares documents based on your instructions. This is different
              from AI Transcription, which converts audio or video into transcript text.
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
              <Mic className="h-10 w-10 text-[#b29dd9] mb-4" />
              <h2 className="text-3xl font-bold mb-4">When to use this service</h2>
              <p className="text-white/90 mb-4">
                Use this service when you want a human-prepared document based on what you explain
                in a recording.
              </p>
              <p className="text-white/90">
                If you only need audio or video converted into text, use AI Transcription instead.
                If you need a document prepared from your audio instructions and supporting files,
                use Document Workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-[#003366] mb-6">
                What audio instructions can help with
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {useCases.map((item) => (
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

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm mb-12">
            <FileAudio className="h-8 w-8 text-[#b29dd9] mb-4" />
            <h2 className="text-2xl font-bold text-[#003366] mb-4">
              When to use AI Transcription instead
            </h2>
            <p className="text-gray-700 mb-5">
              If you only need your audio or video converted into text, use AI Transcription. Use
              Document Workspace when you need a human-prepared document based on your instructions,
              notes, scans, handwriting, templates, or reference files.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/transcript-workspace"
                className="inline-flex items-center justify-center rounded-md bg-[#003366] px-5 py-2 font-semibold text-white hover:bg-[#00264d]"
              >
                Learn About Transcript Workspace
              </Link>
              <Link
                href="/pricing?service=ai"
                className="inline-flex items-center justify-center rounded-md border border-[#003366] px-5 py-2 font-semibold text-[#003366] hover:bg-[#003366] hover:text-white"
              >
                View AI Transcription pricing
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <Upload className="h-8 w-8 text-[#b29dd9] mb-4" />
              <h2 className="text-2xl font-bold text-[#003366] mb-4">
                File quality helps
              </h2>
              <p className="text-gray-700">
                Clear audio, organized instructions, and helpful reference files improve turnaround
                time and pricing accuracy. Include any notes, examples, names, spellings, or source
                files that help explain the document you want prepared.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <ShieldCheck className="h-8 w-8 text-[#b29dd9] mb-4" />
              <h2 className="text-2xl font-bold text-[#003366] mb-4">
                Pricing note
              </h2>
              <p className="text-gray-700 mb-5">
                Projects based on audio instructions are quoted after review because pricing
                depends on the instructions, template, length, formatting, file quality, turnaround
                time, and final document required.
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
              provide legal advice, legal representation, legal analysis, or certified court
              reporting.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm mb-12">
            <h2 className="text-2xl font-bold text-[#003366] mb-4">Related services</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { href: '/document-workspace', label: 'Document Workspace', icon: FileText },
                { href: '/copy-typing-services', label: 'Copy Typing Services', icon: FileText },
                { href: '/handwriting-transcription', label: 'Handwriting Transcription', icon: FileText },
                { href: '/transcript-workspace', label: 'Transcript Workspace', icon: FileAudio },
                { href: '/pricing#document-workspace', label: 'Document Workspace Pricing', icon: ShieldCheck },
                { href: '/pricing?service=ai', label: 'AI Transcription Pricing', icon: FileAudio },
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
              Ready to Start a Document Preparation Project?
            </h2>
            <p className="text-white/90 mb-6">
              Use Document Workspace to submit your audio instructions, supporting files, and
              project notes.
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

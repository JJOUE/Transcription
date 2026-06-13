import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen,
  CheckCircle,
  FileAudio,
  FileText,
  GraduationCap,
  ShieldCheck,
  Upload,
  Users,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Academic Transcription Services Canada | Talk to Text Canada',
  description:
    'Canadian academic transcription services for research interviews, lectures, seminars, academic discussions, and educational audio or video files. AI, hybrid, and human transcription options available.',
  metadataBase: new URL('https://www.talktotext.ca'),
  openGraph: {
    title: 'Academic Transcription Services Canada | Talk to Text Canada',
    description:
      'Canadian academic transcription services for research interviews, lectures, seminars, academic discussions, and educational audio or video files. AI, hybrid, and human transcription options available.',
    url: 'https://www.talktotext.ca/academic-transcription',
    type: 'website',
  },
};

const academicUses = [
  {
    title: 'Research interviews',
    text: 'Transcribe research, study, participant, or stakeholder interview recordings.',
  },
  {
    title: 'Lecture recordings',
    text: 'Turn recorded lectures into transcript text for review, study, or reference.',
  },
  {
    title: 'Seminar recordings',
    text: 'Prepare transcripts from seminars, workshops, academic panels, or presentations.',
  },
  {
    title: 'Academic discussions',
    text: 'Create transcript text from group discussions, recorded conversations, or educational sessions.',
  },
  {
    title: 'Student or professor recordings',
    text: 'Support student recordings, professor recordings, and academic audio or video files.',
  },
  {
    title: 'Thesis or dissertation research notes',
    text: 'Convert recorded research notes and interviews into text for review and organization.',
  },
];

const serviceOptions = [
  {
    title: 'AI Transcription',
    text: 'A faster option for academic audio or video converted into text.',
    href: '/pricing?service=ai',
  },
  {
    title: 'Hybrid Review',
    text: 'AI transcript plus human review for clients who want an extra review step.',
    href: '/pricing?service=hybrid',
  },
  {
    title: 'Human Transcription',
    text: 'Human-prepared transcription for clients who need more careful review.',
    href: '/pricing?service=human',
  },
  {
    title: 'Document Workspace',
    text: 'Use this if you need a human-prepared document from audio instructions, notes, handwriting, or files.',
    href: '/document-workspace',
  },
];

const workflowSteps = [
  'Create your account.',
  'Upload your academic audio or video.',
  'Add speaker count, names, spellings, terminology, or project dictionary terms.',
  'Review your transcript in Transcript Workspace.',
  'Save and download your completed transcript.',
];

export default function AcademicTranscriptionPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <p className="text-sm font-semibold text-[#b29dd9] uppercase tracking-wide mb-3">
              Academic Transcription
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-[#003366] mb-6">
              Academic Transcription Services in Canada
            </h1>
            <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto mb-4">
              Upload academic audio or video files, choose AI, Hybrid, or Human transcription, and
              download your completed transcript securely.
            </p>
            <p className="text-sm text-gray-500 max-w-3xl mx-auto mb-8">
              Academic transcription is helpful for interviews, lectures, research recordings,
              seminars, academic discussions, and educational audio or video files.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signin"
                className="inline-flex items-center justify-center rounded-md bg-[#003366] px-6 py-3 font-semibold text-white hover:bg-[#00264d]"
              >
                Start a Transcription Project
              </Link>
              <Link
                href="/pricing"
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
              <GraduationCap className="h-10 w-10 text-[#b29dd9] mb-4" />
              <h2 className="text-3xl font-bold mb-4">Academic transcription support</h2>
              <p className="text-white/90 mb-4">
                Talk to Text Canada provides Canadian academic transcription services for students,
                researchers, professors, universities, and academic professionals.
              </p>
              <p className="text-white/90">
                Use Transcript Workspace when you need audio or video converted into a transcript.
                Use Document Workspace when you need a human-prepared document from audio
                instructions, notes, files, scans, handwriting, templates, or references.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-[#003366] mb-6">
                What academic transcription can help with
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {academicUses.map((item) => (
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
            <h2 className="text-3xl font-bold text-[#003366] mb-8">Service options</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {serviceOptions.map((option) => (
                <Link
                  key={option.title}
                  href={option.href}
                  className="rounded-xl bg-gray-50 border border-gray-200 p-5 hover:border-[#003366] hover:bg-white"
                >
                  <FileAudio className="h-6 w-6 text-[#b29dd9] mb-3" />
                  <h3 className="font-semibold text-[#003366] mb-2">{option.title}</h3>
                  <p className="text-sm text-gray-700">{option.text}</p>
                </Link>
              ))}
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
                Clear audio, speaker information, and research or academic terminology can help
                improve transcript quality. Add names, spellings, organizations, course terms, or
                project dictionary terms that may appear in the recording.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <BookOpen className="h-8 w-8 text-[#b29dd9] mb-4" />
              <h2 className="text-2xl font-bold text-[#003366] mb-4">
                Academic terminology
              </h2>
              <p className="text-gray-700">
                Project dictionary terms can help with names, places, organizations, technical
                terms, research terminology, acronyms, and preferred spellings related to your
                recording.
              </p>
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
              Talk to Text Canada provides transcription and document preparation support. We do not
              provide legal advice, legal representation, or certified court reporting.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm mb-12">
            <h2 className="text-2xl font-bold text-[#003366] mb-4">Related services</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { href: '/transcript-workspace', label: 'Transcript Workspace', icon: FileAudio },
                { href: '/pricing', label: 'Transcription Pricing', icon: ShieldCheck },
                { href: '/pricing?service=ai', label: 'AI Transcription Pricing', icon: FileAudio },
                { href: '/pricing?service=hybrid', label: 'Hybrid Review Pricing', icon: CheckCircle },
                { href: '/pricing?service=human', label: 'Human Transcription Pricing', icon: Users },
                { href: '/document-workspace', label: 'Document Workspace', icon: FileText },
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
              Ready to Start an Academic Transcription Project?
            </h2>
            <p className="text-white/90 mb-6">
              Upload your academic audio or video file and review the completed transcript in your
              secure workspace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signin"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 font-semibold text-[#003366] hover:bg-gray-100"
              >
                Start a Transcription Project
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-md border border-white px-6 py-3 font-semibold text-white hover:bg-white hover:text-[#003366]"
              >
                View Pricing
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-md border border-white px-6 py-3 font-semibold text-white hover:bg-white hover:text-[#003366]"
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

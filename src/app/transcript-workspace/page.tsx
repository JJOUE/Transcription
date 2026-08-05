import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  Clock,
  Download,
  FileText,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Transcript Workspace | Talk to Text Canada',
  description:
    "Upload, edit, review, and download transcripts using Talk to Text Canada's secure Transcript Workspace with speaker tools, cleanup tools, timestamps, dictionaries, and export options.",
  metadataBase: new URL('https://www.talktotext.ca'),
  openGraph: {
    title: 'Transcript Workspace | Talk to Text Canada',
    description:
      "Upload, edit, review, and download transcripts using Talk to Text Canada's secure Transcript Workspace with speaker tools, cleanup tools, timestamps, dictionaries, and export options.",
    url: 'https://www.talktotext.ca/transcript-workspace',
    type: 'website',
  },
};

const howItWorks = [
  'Upload your audio or video',
  'Choose AI, Hybrid, or Human Review',
  'Add speaker count and project terms',
  'Review and edit your transcript',
  'Download in the format you need',
];

const usageSteps = [
  {
    title: 'Create your account',
    text: 'Sign in or create an account to access your secure workspace.',
  },
  {
    title: 'Upload your audio or video',
    text: 'Choose your transcription service and upload your audio or video file.',
  },
  {
    title: 'Add helpful details',
    text: 'Enter the expected number of speakers and any names, spellings, places, organizations, or project dictionary terms that may help with accuracy.',
  },
  {
    title: 'Wait for your transcript',
    text: 'Your file will be processed according to the transcription option you selected.',
  },
  {
    title: 'Open your transcript',
    text: 'When your transcript is ready, open it in Transcript Workspace from your dashboard.',
  },
  {
    title: 'Review and edit',
    text: 'Use Edit Transcript to correct text, rename speakers, adjust speaker labels, split speakers, and clean up formatting.',
  },
  {
    title: 'Use cleanup tools',
    text: 'Use light cleanup tools for filler words, duplicate words, timestamps, and formatting. These tools are designed to help clean the transcript without rewriting the meaning.',
  },
  {
    title: 'Save and download',
    text: 'Save your edits and download your completed transcript.',
  },
  {
    title: 'Download before retention ends',
    text: 'Completed files remain active for 30 days, may be archived after 30 days, and may be deleted after 90 days unless a retention hold applies. Download anything you need before the deletion date shown in your dashboard.',
  },
];

const features = [
  {
    title: 'AI, Hybrid, and Human Review',
    text: 'Choose the service level that fits your file, timeline, and review needs.',
  },
  {
    title: 'Expected speaker count',
    text: 'Tell the workspace how many people you expect in the file to support later speaker review.',
  },
  {
    title: 'Project Dictionary',
    text: 'Add names, places, acronyms, brands, and preferred spellings for the current job.',
  },
  {
    title: 'Client Dictionary',
    text: 'Reuse private saved terms on future uploads without exposing them to other clients.',
  },
  {
    title: 'Secure dashboard',
    text: 'Manage completed transcripts, downloads, retention dates, and workspace access from your account.',
  },
  {
    title: 'Canadian spelling support',
    text: 'Transcript review tools are designed with Canadian English workflows in mind where applicable.',
  },
];

const editingTools = [
  'Grouped paragraph editing for a smoother review experience',
  'Inline speaker labels and custom speaker names',
  'New speaker split from Paragraph Actions',
  'Paragraph deletion for irrelevant or duplicate sections',
  'Light Grammar Pass for spacing, punctuation spacing, and simple capitalization',
  'Filler and duplicate word tools selected by the user',
  'Ellipses to em dash formatting option',
  'Timestamp tools for 30 seconds, 60 seconds, 5 minutes, or no timestamps',
];

const exportOptions = [
  'Save Transcript keeps accepted edits in the workspace',
  'Save & Download saves first, then downloads the edited version',
  'DOCX and PDF downloads are available where supported',
  'Speaker label template formats support different document styles',
  'Timestamp display can be included or removed depending on the selected option',
];

export default function TranscriptWorkspacePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <section className="bg-white border-b">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
              <div>
                <p className="text-sm font-semibold text-[#b29dd9] uppercase tracking-wide mb-3">
                  Secure Canadian transcription workspace
                </p>
                <h1 className="text-4xl md:text-5xl font-bold text-[#003366] mb-6">
                  Transcript Workspace
                </h1>
                <p className="text-lg md:text-xl text-gray-700 mb-8">
                  Upload, review, edit, and download professional transcripts from one secure workspace.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/upload"
                    className="inline-flex items-center justify-center rounded-md bg-[#003366] px-6 py-3 font-semibold text-white hover:bg-[#00264d]"
                  >
                    Start a Transcript
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-md border border-[#003366] px-6 py-3 font-semibold text-[#003366] hover:bg-[#003366] hover:text-white"
                  >
                    View Pricing
                  </Link>
                  <Link
                    href="/signin"
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:border-[#003366] hover:text-[#003366]"
                  >
                    Sign In
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm">
                <div className="rounded-xl bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                    <div>
                      <p className="text-sm font-semibold text-[#003366]">Transcript Workspace</p>
                      <p className="text-xs text-gray-500">Review, edit, export</p>
                    </div>
                    <ShieldCheck className="h-7 w-7 text-[#b29dd9]" />
                  </div>
                  <div className="space-y-3">
                    {['Speaker Tools', 'Timestamp Tools', 'Light Grammar Pass', 'Export Options'].map((item) => (
                      <div key={item} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                        <span className="text-sm font-medium text-gray-700">{item}</span>
                        <CheckCircle className="h-4 w-4 text-[#003366]" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="mb-14 rounded-2xl bg-gradient-to-r from-[#003366] to-[#b29dd9] p-8 text-white">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-3">See how Transcript Workspace works</h2>
                <p className="text-white/90">
                  A short walkthrough video will appear here showing upload, editing, speaker tools,
                  cleanup tools, and download options.
                </p>
              </div>
              <div className="rounded-xl border border-white/30 bg-white/10 p-8 text-center">
                <PlayCircle className="mx-auto mb-4 h-16 w-16 text-white" />
                <p className="font-semibold">Demo video placeholder</p>
                <p className="mt-2 text-sm text-white/80">
                  No video is linked yet, so there is no broken media to load.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-14 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-[#003366] mb-3">
                How to use Transcript Workspace
              </h2>
              <p className="text-gray-700 max-w-2xl mx-auto">
                Follow these steps to upload, review, edit, save, and download your transcript from
                your secure workspace.
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
          </div>

          <div className="mb-14">
            <h2 className="text-3xl font-bold text-[#003366] text-center mb-8">How it works</h2>
            <div className="grid md:grid-cols-5 gap-4">
              {howItWorks.map((step, index) => (
                <div key={step} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[#b29dd9]/20 font-bold text-[#003366]">
                    {index + 1}
                  </div>
                  <p className="text-sm font-medium text-gray-700">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-14">
            <h2 className="text-3xl font-bold text-[#003366] text-center mb-8">Workspace features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div key={feature.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <Sparkles className="mb-4 h-7 w-7 text-[#b29dd9]" />
                  <h3 className="font-semibold text-[#003366] mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-700">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 mb-14">
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <BookOpen className="mb-4 h-8 w-8 text-[#b29dd9]" />
              <h2 className="text-2xl font-bold text-[#003366] mb-4">Editing tools</h2>
              <ul className="space-y-3 text-sm text-gray-700">
                {editingTools.map((tool) => (
                  <li key={tool} className="flex gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#003366]" />
                    <span>{tool}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <Download className="mb-4 h-8 w-8 text-[#b29dd9]" />
              <h2 className="text-2xl font-bold text-[#003366] mb-4">Export and download</h2>
              <ul className="space-y-3 text-sm text-gray-700">
                {exportOptions.map((option) => (
                  <li key={option} className="flex gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#003366]" />
                    <span>{option}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-14 rounded-2xl border border-blue-100 bg-blue-50 p-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <Clock className="h-8 w-8 flex-shrink-0 text-[#003366]" />
              <div>
                <h2 className="text-2xl font-bold text-[#003366] mb-3">File retention notice</h2>
                <p className="text-gray-700">
                  Files remain active in your dashboard for 30 days after completion. After 30 days,
                  files may be archived. Archived files remain available until the 90-day retention
                  period ends. After 90 days, audio files, transcript files, completed documents, and
                  related downloads may be permanently deleted unless a retention hold has been applied.
                  Please download anything you need before the deletion date.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-14 grid lg:grid-cols-[0.85fr_1.15fr] gap-8 items-center">
            <div className="rounded-2xl bg-[#003366] p-8 text-white">
              <UserRound className="mb-4 h-9 w-9 text-[#b29dd9]" />
              <h2 className="text-3xl font-bold mb-3">Built by a transcription professional</h2>
              <p className="text-white/90">
                Talk to Text Canada was built by a Canadian transcription professional and designed
                for practical transcript review, correction, and download.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <h3 className="text-2xl font-bold text-[#003366] mb-4">Designed for real review work</h3>
              <p className="text-gray-700 mb-4">
                Transcript Workspace supports legal, business, academic, and professional transcription
                workflows where clients need a secure place to review, correct, organize, and export
                transcripts.
              </p>
              <p className="text-gray-700">
                Built on 27 years of combined legal documentation and transcription experience.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-r from-[#003366] to-[#b29dd9] p-8 text-center text-white">
            <FileText className="mx-auto mb-4 h-10 w-10 text-white" />
            <h2 className="text-3xl font-bold mb-3">Ready to start a transcript?</h2>
            <p className="text-white/90 mb-6">
              Upload your file, choose the review level you need, and manage the finished transcript
              in your secure workspace.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/upload"
                className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 font-semibold text-[#003366] hover:bg-gray-100"
              >
                Start a Transcript
                <ArrowRight className="ml-2 h-4 w-4" />
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

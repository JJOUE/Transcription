'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Users,
  Lock,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Award,
  Briefcase,
  Scale,
  Headphones
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'Are your transcripts court-certified?',
    answer: 'The preparation method depends on the service selected. AI Transcription is self-service, Hybrid Transcription uses AI followed by professional audio review, and Human Transcription is created from the original audio without an AI-generated draft. These are not court-certified court reporter transcripts. For certified court reporting, please hire a certified court reporter.'
  },
  {
    question: 'Is human review available for legal transcripts?',
    answer: 'Yes. Hybrid Transcription includes professional review of an AI-generated first transcript. Human Transcription is typed, formatted, reviewed against the original recording, and proofread by a professional transcriptionist without an AI-generated draft.'
  },
  {
    question: 'Do you support legal hearings and administrative proceedings?',
    answer: 'Yes. We support transcription of legal hearings, administrative proceedings, statements, interviews, and audio instructions for document preparation. Our Canadian English transcription service is designed for Canadian legal workflows and document support.'
  },
  {
    question: 'Is AI transcription appropriate for legal audio?',
    answer: 'AI Transcription is intended for users who will review and correct the AI-generated transcript themselves. Clients who want Professional Transcription should choose Hybrid Transcription for AI plus professional review, or Human Transcription for work created from the original audio without an AI-generated draft.'
  },
  {
    question: 'Can I download transcripts securely?',
    answer: 'Yes. All transcripts can be downloaded as DOCX, PDF, SRT, or VTT files from your secure dashboard. Files are encrypted in transit and at rest, and you can manage access through your account settings.'
  }
];

export function LegalTranscriptionContent() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <>
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-[#003366] mb-4">
          Legal Transcription Services Built for Canadian Legal Workflows
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Professional transcription for legal hearings, statements, interviews, audio instructions for document preparation, and law office workflows. AI is used only when you select AI Transcription or Hybrid Transcription.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-[#b29dd9] hover:bg-[#9e7fbd] text-white"
            onClick={() => window.location.href = '/professional-transcription'}
          >
            Professional Transcription
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white"
            onClick={() => window.location.href = '/transcript-workspace'}
          >
            Self-Service AI
          </Button>
        </div>
      </div>

      <Card className="mb-12 bg-gradient-to-r from-[#003366] to-[#b29dd9] text-white border-0">
        <CardContent className="pt-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-20 w-20 rounded-full bg-white bg-opacity-20">
                <Award className="h-12 w-12 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Backed by Legal Operations Experience</h2>
              <p className="text-gray-100 mb-4">
                Talk to Text Canada is founded on decades of legal support experience in Toronto, with strong roots in law office workflows, document preparation, and professional transcription services.
              </p>
              <p className="text-sm text-gray-100">
                Our service is designed to meet the confidentiality, clarity, and workflow needs of legal professionals without claiming legal advice or certified court reporting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-12">
        <h2 className="text-3xl font-bold text-[#003366] mb-8 text-center">Legal Transcription Services for Professional Workflows</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-[#b29dd9]" />
                Legal Hearings & Proceedings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Accurate transcription support for legal hearings, administrative proceedings, and professional legal review workflows.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Legal hearing transcription support</li>
                <li>✓ Document workflow friendly</li>
                <li>✓ Secure delivery</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-[#b29dd9]" />
                Statements & Interviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Professional transcription of recorded statements, interviews, and client conversations with clear speaker identification.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Statement transcription support</li>
                <li>✓ Interview text capture</li>
                <li>✓ Editable transcripts</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#b29dd9]" />
                Witness & Client Recordings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Confidential transcription for witness recordings, client consultations, and law office communication.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Confidential handling</li>
                <li>✓ Encrypted delivery</li>
                <li>✓ Secure dashboard</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#b29dd9]" />
                Audio Instructions & Correspondence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Convert audio instructions, correspondence, memos, and case notes into polished documents for legal office use.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Professional document preparation support</li>
                <li>✓ Office-ready formatting</li>
                <li>✓ Human review available</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#b29dd9]" />
                Hybrid Transcription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                AI-generated first, then reviewed and corrected against the original audio by a professional transcriptionist. This is the more affordable professionally reviewed option.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ AI speed plus expert review</li>
                <li>✓ Legal terminology awareness</li>
                <li>✓ Workflow-friendly turnaround</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-[#b29dd9]" />
                Human Transcription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                No AI-generated transcript. Your recording is typed, formatted, reviewed against the original audio, speaker formatted, paragraph formatted, and proofread by a professional transcriptionist.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Detailed human review</li>
                <li>✓ Legal document support</li>
                <li>✓ Premium turnaround</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mb-12 border-0 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-2xl text-[#003366] flex items-center gap-2">
            <Lock className="h-6 w-6 text-[#b29dd9]" />
            Quality, Security & Legal Documentation Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-[#003366] mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Canadian English Expertise
              </h3>
              <p className="text-gray-700 text-sm">
                All transcription is optimized for Canadian English, including proper terminology for legal and administrative contexts.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-[#003366] mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Legal Terminology Awareness
              </h3>
              <p className="text-gray-700 text-sm">
                Legal domain support improves recognition of procedure names, legal terms, and formal language used in Canadian legal proceedings.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-[#003366] mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Secure Dashboard Delivery
              </h3>
              <p className="text-gray-700 text-sm">
                All transcripts are delivered securely through your encrypted dashboard. Only you and authorized team members can access your files.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-[#003366] mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Downloadable Files
              </h3>
              <p className="text-gray-700 text-sm">
                Export transcripts as DOCX, PDF, SRT, or VTT files. Maintain your own copies for archival, backup, and integration with your systems.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-[#003366] mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Choose Who Edits the Transcript
              </h3>
              <p className="text-gray-700 text-sm">
                With AI Transcription, you review and edit the AI-generated transcript yourself. Hybrid Transcription combines AI with professional audio review. Human Transcription is created from the original audio without an AI-generated draft.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-[#003366] mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                No Auto-Paraphrasing
              </h3>
              <p className="text-gray-700 text-sm">
                Legal testimony and statements are transcribed verbatim. No automatic paraphrasing or editing—capturing exactly what was spoken.
              </p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <p className="text-sm text-gray-700">
              <strong>Important:</strong> Talk to Text Canada provides professional transcription services. We do not provide legal advice, certified court reporting, or legal representation. Our transcripts are suitable for legal documentation, but if you require certified court reporting, please contact a certified court reporter.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-12 bg-gradient-to-r from-[#003366] to-[#b29dd9] text-white border-0">
        <CardHeader>
          <CardTitle className="text-3xl">Ready to Transform Your Legal Transcription?</CardTitle>
          <CardDescription className="text-gray-100 mt-2">
            Choose Transcript Workspace for self-service AI transcription, Hybrid Transcription for a more affordable professionally reviewed transcript, or Human Transcription for human-only preparation from the original audio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              className="bg-white text-[#003366] hover:bg-gray-100"
              onClick={() => window.location.href = '/professional-transcription'}
            >
              Choose Professional Transcription
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-[#003366]"
              onClick={() => window.location.href = '/pricing'}
            >
              View Pricing
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-[#003366]"
              onClick={() => window.location.href = '/contact'}
            >
              Contact Us
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
          <CardDescription>
            Common questions about legal transcription services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <div key={index} className="border rounded-lg">
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{item.question}</span>
                  {expandedFAQ === index ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {expandedFAQ === index && (
                  <div className="px-4 pb-3 border-t">
                    <p className="text-gray-600 text-sm mt-3">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

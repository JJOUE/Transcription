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
    answer: 'Our transcripts are professional-quality transcriptions created using AI and human expertise. They are not court-certified court reporter transcripts. For certified court reporting, please hire a certified court reporter. Our human-reviewed transcriptions are suitable for legal documentation, evidence files, and office workflows.'
  },
  {
    question: 'Is human review available for legal transcripts?',
    answer: 'Yes. We offer Human Transcription mode for legal audio. Our transcribers are experienced with legal documentation and can review terminology, proper names, and formal language to support professional legal workflows.'
  },
  {
    question: 'Do you support legal hearings and administrative proceedings?',
    answer: 'Yes. We support transcription of legal hearings, administrative proceedings, statements, interviews, and dictation. Our Canadian English transcription service is designed for Canadian legal workflows and document support.'
  },
  {
    question: 'Is AI transcription appropriate for legal audio?',
    answer: 'AI transcription can be a strong starting point for legal audio, offering fast turnaround and precise text capture. For important legal material, we recommend Hybrid Review or Human Transcription to add a second layer of accuracy and review.'
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
          Professional transcription for legal hearings, statements, interviews, dictation, and law office workflows. Backed by experienced legal transcription specialists and modern AI tools.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="bg-[#b29dd9] hover:bg-[#9e7fbd] text-white"
            onClick={() => window.location.href = '/upload'}
          >
            Start with AI Transcription
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white"
            onClick={() => window.location.href = '/pricing'}
          >
            View Pricing & Services
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
                Legal Dictation & Correspondence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Convert dictation, correspondence, memos, and case notes into polished documents for legal office use.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Professional dictation support</li>
                <li>✓ Office-ready formatting</li>
                <li>✓ Human review available</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#b29dd9]" />
                Hybrid AI + Human Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Combine AI speed with human review to support legal accuracy and quality in document workflows.
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
                Human-Reviewed Legal Transcription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                100% human transcription for legal documentation support, reviewed by experienced transcription professionals.
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
                Human Review Available
              </h3>
              <p className="text-gray-700 text-sm">
                All transcription modes include options for human review by experienced transcription professionals to ensure quality and reliability.
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
            Start with AI Transcription for immediate results, or choose Human Review for maximum accuracy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              size="lg"
              className="bg-white text-[#003366] hover:bg-gray-100"
              onClick={() => window.location.href = '/upload'}
            >
              Upload Your First File
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

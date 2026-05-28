'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Shield,
  FileText,
  Users,
  Lock,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Award,
  Briefcase,
  Scale,
  Headphones,
  Download,
  HelpCircle
} from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "Are your transcripts court-certified?",
    answer: "Our transcripts are professional-quality transcriptions created using AI and human expertise. They are not court-certified court reporter transcripts. For certified court reporting, you would need to hire a court reporter. However, our human-reviewed transcriptions are suitable for legal documentation, evidence files, and archival purposes."
  },
  {
    question: "Is human review available for legal transcripts?",
    answer: "Yes, absolutely. We offer Human Transcription mode (100% human review) for legal audio. Our transcribers have legal documentation experience and are trained to handle legal terminology, proper names, and specialized language. This ensures accuracy for legal proceedings and documentation."
  },
  {
    question: "Do you support IRB and refugee hearing transcription?",
    answer: "Yes. We support transcription of immigration and refugee hearings, IRB proceedings, and legal interviews. Our Canadian English transcription service is optimized for Canadian legal accents and terminology, making it ideal for transcribing Canadian legal and immigration proceedings."
  },
  {
    question: "Is AI transcription appropriate for legal audio?",
    answer: "AI transcription can be a cost-effective starting point for legal audio, achieving 95%+ accuracy with 60-minute turnaround. For legal proceedings where accuracy is critical, we recommend our Human Transcription or Hybrid Review services. Hybrid combines AI speed with human review for 98%+ accuracy in 3–5 business days."
  },
  {
    question: "Can I download transcripts securely?",
    answer: "Yes. All transcripts are available for download as DOCX, PDF, SRT, or VTT formats directly from your dashboard. Files are encrypted in transit and at rest using Firebase's secure infrastructure. You maintain full control over your files and can delete them anytime."
  },
  {
    question: "Do you support specialized legal terminology?",
    answer: "Yes. Our transcription service includes a legal domain option that enhances recognition of legal terminology, court procedures, and specialized language common in legal contexts. This is available for all transcription modes (AI, Hybrid, and Human)."
  },
  {
    question: "What happens if someone needs the transcript urgently?",
    answer: "AI Transcription delivers results in as little as 60 minutes. Human and Hybrid services typically take 3–5 business days. If you need faster human review, let us know when uploading and we can discuss expedited options."
  },
  {
    question: "Can I edit transcripts after delivery?",
    answer: "Yes. All transcripts are editable directly in our secure Document Workspace. You can correct errors, adjust speaker names, add timestamps, and make any necessary changes. Edits are saved automatically and securely."
  }
];

export function LegalTranscriptionContent() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <>
      {/* Hero Section */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-[#003366] mb-4">
          Legal Transcription Services Built for Canadian Legal Workflows
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
          Professional transcription for immigration hearings, legal interviews, witness statements, and law firm dictation. Backed by 20+ years of legal expertise and modern AI technology.
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

      {/* Founder Credibility Section */}
      <Card className="mb-12 bg-gradient-to-r from-[#003366] to-[#b29dd9] text-white border-0">
        <CardContent className="pt-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-20 w-20 rounded-full bg-white bg-opacity-20">
                <Award className="h-12 w-12 text-white" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Backed by Legal Expertise</h2>
              <p className="text-gray-100 mb-4">
                Talk to Text Canada is built on the expertise of Jennifer Ouellette, who brings 20+ years of experience as a legal assistant and law clerk in Toronto, plus 7 years of transcription specialization. Understanding Canadian legal processes, terminology, and requirements is embedded into our service design.
              </p>
              <p className="text-sm text-gray-100">
                Jennifer's legal background ensures that Talk to Text Canada respects the accuracy, security, and professionalism required in legal documentation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Section */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-[#003366] mb-8 text-center">Transcription Services for Legal Professionals</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Service Card 1 */}
          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-[#b29dd9]" />
                  IRB & Immigration Hearings
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Professional transcription of Immigration and Refugee Board hearings, refugee claimant interviews, and immigration proceedings. Canadian English optimized for diverse accents and legal terminology.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Canadian English expertise</li>
                <li>✓ Legal domain terminology support</li>
                <li>✓ Secure file delivery</li>
              </ul>
            </CardContent>
          </Card>

          {/* Service Card 2 */}
          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headphones className="h-5 w-5 text-[#b29dd9]" />
                Legal Interviews & Statements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Accurate transcription of client interviews, witness statements, legal consultations, and recorded depositions. Maintains speaker identification and timing.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Speaker identification</li>
                <li>✓ Timestamp accuracy</li>
                <li>✓ Editable transcripts</li>
              </ul>
            </CardContent>
          </Card>

          {/* Service Card 3 */}
          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[#b29dd9]" />
                Lawyer-Client & Witness Recordings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Confidential transcription of lawyer-client conversations, witness interviews, and recorded consultations with full attention to legal privilege and accuracy.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Confidentiality prioritized</li>
                <li>✓ Encrypted delivery</li>
                <li>✓ Secure dashboard</li>
              </ul>
            </CardContent>
          </Card>

          {/* Service Card 4 */}
          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-[#b29dd9]" />
                Legal Dictation & Correspondence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Convert dictated memos, correspondence, case notes, and legal opinions into professional documents. AI speed with human accuracy available for legal documents.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Fast turnaround options</li>
                <li>✓ Legal formatting preserved</li>
                <li>✓ Human review available</li>
              </ul>
            </CardContent>
          </Card>

          {/* Service Card 5 */}
          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#b29dd9]" />
                Hybrid: AI + Human Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                Best of both worlds: AI transcription reviewed by legal-experienced transcribers. 98%+ accuracy in 3–5 business days. Ideal for critical legal proceedings.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ 98%+ accuracy guarantee</li>
                <li>✓ Legal expertise review</li>
                <li>✓ 3–5 business day turnaround</li>
              </ul>
            </CardContent>
          </Card>

          {/* Service Card 6 */}
          <Card className="border-l-4 border-l-[#b29dd9] hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-[#b29dd9]" />
                Human-Reviewed Legal Transcription
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-3">
                100% human transcription for maximum accuracy and legal compliance. Professional transcribers with legal documentation experience ensure precision.
              </p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ 99%+ accuracy</li>
                <li>✓ Legal experience included</li>
                <li>✓ Premium turnaround</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quality & Safety Section */}
      <Card className="mb-12 border-0 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-2xl text-[#003366] flex items-center gap-2">
            <Lock className="h-6 w-6 text-[#b29dd9]" />
            Quality, Security & Legal Compliance
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
                All transcription is optimized for Canadian English, including proper terminology for Canadian legal, immigration, and business contexts.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-[#003366] mb-3 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Legal Terminology Awareness
              </h3>
              <p className="text-gray-700 text-sm">
                Legal domain option enhances recognition of court procedures, legal terms, and specialized language used in Canadian legal proceedings.
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
                All transcription modes include options for human review by experienced legal transcribers to ensure accuracy and compliance.
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

      {/* CTA Section */}
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

      {/* FAQ Section */}
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

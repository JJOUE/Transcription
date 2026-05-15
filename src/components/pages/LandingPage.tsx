"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      {/* Hero Section */}
      <section
        className="relative text-white"
        style={{
          backgroundImage: "url('/bg_1.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#003366]/80 to-[#2c3e50]/80"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Canadian Transcription & Dictation Services Built by a Professional Transcriptionist
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-4 max-w-xl mx-auto lg:mx-0">
                Talk to Text Canada is built by a transcriptionist for transcriptionists, legal professionals, businesses, and anyone who needs cleaner, more accurate transcripts and finished documents.
              </p>
              <p className="text-base text-gray-200 mb-8 max-w-xl mx-auto lg:mx-0">
                Designed to lighten workflow, reduce editing time, and deliver ready-to-use files at a fraction of traditional transcription costs.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto lg:mx-0 mb-10 text-left">
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#b29dd9] mb-2">Step 1</p>
                  <p className="font-semibold text-white">Upload your audio or dictation file</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#b29dd9] mb-2">Step 2</p>
                  <p className="font-semibold text-white">Choose transcription or dictation-to-document service</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#b29dd9] mb-2">Step 3</p>
                  <p className="font-semibold text-white">Download transcripts or finished documents</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#b29dd9] hover:bg-[#9d87c7] text-white text-lg px-15 py-4"
                >
                  <Link href="/signin">
                    Start Transcription
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-2 border-white !bg-white !text-[#003366] hover:!bg-gray-50 hover:!text-[#003366] text-lg px-8 py-4 font-medium opacity-100"
                >
                  <Link href="/signup">Create Account</Link>
                </Button>
              </div>

              <p className="text-sm text-gray-200 mt-6 max-w-xl mx-auto lg:mx-0">
                Download options may include PDF, locked PDF, DOCX, TXT, SRT, and VTT depending on the service selected.
              </p>
            </div>

            {/* Mascot Image */}
            <div className="hidden lg:flex justify-center lg:justify-end">
              <Image
                src="/mascot.png"
                alt="Talk To Text Canada Mascot"
                width={450}
                height={450}
                className="drop-shadow-2xl"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Choose the Service That Fits Your Workflow
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We offer AI, human, hybrid, and dictation-to-document services to meet different accuracy, budget, and workflow needs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Image src="/images/AI.svg" alt="AI Transcription" width={48} height={48} className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">AI Transcription</h3>
                <p className="text-gray-600 mb-6">
                  Fast AI transcription for clear audio, meetings, interviews, notes, and general recordings.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Instant processing</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Editable transcripts</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />PDF, DOCX, TXT, SRT, VTT</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Image src="/images/Human.svg" alt="Human Transcription" width={48} height={48} className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">Human Transcription</h3>
                <p className="text-gray-600 mb-6">
                  Professional human transcription for legal, business, academic, and complex audio.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Human-prepared accuracy</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Professional formatting</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Locked PDF or DOCX options</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Image src="/images/Hybrid.svg" alt="Hybrid Review" width={56} height={56} className="w-14 h-14" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">Hybrid Review</h3>
                <p className="text-gray-600 mb-6">
                  AI speed combined with human review for cleaner, more reliable Canadian transcripts.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Fast + accurate</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Human reviewed</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />PDF, DOCX, TXT, SRT, VTT</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow ring-2 ring-[#b29dd9]">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-9 w-9 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">Dictation to Documents</h3>
                <p className="text-gray-600 mb-6">
                  Upload dictated audio and receive a finished document — not just a transcript.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Letters, case notes, reports</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Court and office documents</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Editable DOCX and PDF options</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Built for Legal, Business, and Professional Workflows
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Secure, confidential, and designed to support practical transcript and document preparation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                <Image src="/TBLP/Accuracy rate.svg" alt="Accuracy" width={64} height={64} className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-[#003366] mb-2">99.5%</div>
                <div className="text-gray-600">Accuracy Goal</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                <Image src="/TBLP/24-7.svg" alt="Processing" width={64} height={64} className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-[#003366] mb-2">24/7</div>
                <div className="text-gray-600">AI Processing</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                <Image src="/TBLP/SOC 2.svg" alt="Compliance" width={64} height={64} className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-[#003366] mb-2">Secure</div>
                <div className="text-gray-600">Client Workflow</div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                <Image src="/TBLP/10K+.svg" alt="Files Processed" width={64} height={64} className="w-full h-full object-cover" />
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-[#003366] mb-2">Files</div>
                <div className="text-gray-600">Direct Downloads</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section 
        className="relative text-white py-24"
        style={{
          backgroundImage: "url('/bg_2.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-[#003366]/80"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            From Audio to Finished Work — Faster
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            <span className="block mb-4"><strong>Transcription:</strong> Convert audio into structured transcripts with AI, human, or hybrid options.</span>
            <span className="block"><strong>Dictation:</strong> Upload spoken instructions and receive polished letters, case notes, reports, court documents, or other finished documents.</span>
          </p>
          <Button
            asChild
            size="lg"
            className="bg-[#b29dd9] hover:bg-[#9d87c7] text-white text-lg px-8 py-3"
          >
            <Link href="/signin">
              Start Your Free Account
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default LandingPage;
export { LandingPage };

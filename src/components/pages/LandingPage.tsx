"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle } from 'lucide-react';
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
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#003366]/80 to-[#2c3e50]/80"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Text Content */}
            <div className="text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                Professional Transcription
                <span className="block text-[#b29dd9]">& Dictation Services</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-xl mx-auto lg:mx-0">
                Built by a transcriptionist — designed for real-world workflows. 
                Get accurate, professionally formatted transcripts and finished documents without the back-and-forth.
              </p>
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
                  <Link href="/signin">Submit Dictation</Link>
                </Button>
              </div>
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
              Why Choose Talk To Text Canada?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              We offer three transcription modes to meet your specific needs and budget.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Image
                    src="/images/AI.svg"
                    alt="AI Transcription"
                    width={48}
                    height={48}
                    className="w-12 h-12"
                  />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  AI Transcription
                </h3>
                <p className="text-gray-600 mb-6">
                  Fast, automated transcription with high accuracy. Perfect for quick turnarounds 
                  and cost-effective solutions.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Instant processing
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Editable transcripts
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Most affordable
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Image
                    src="/images/Human.svg"
                    alt="Human Transcription"
                    width={48}
                    height={48}
                    className="w-12 h-12"
                  />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  Human Transcription
                </h3>
                <p className="text-gray-600 mb-6">
                  Professional human transcribers ensure the highest accuracy for legal 
                  and business-critical documents.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    99%+ accuracy
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Legal expertise
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Quality guaranteed
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Image
                    src="/images/Hybrid.svg"
                    alt="Hybrid Review"
                    width={56}
                    height={56}
                    className="w-14 h-14"
                  />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  Hybrid Review
                </h3>
                <p className="text-gray-600 mb-6">
                  AI speed with human precision. Get the best of both worlds with 
                  AI transcription reviewed by professionals.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Fast + accurate
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Human verified
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    Best value
                  </li>
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
              Trusted by Legal Professionals
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Secure, confidential, and compliant with Canadian privacy regulations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                <Image
                  src="/TBLP/Accuracy rate.svg"
                  alt="Accuracy"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-[#003366] mb-2">99.5%</div>
                <div className="text-gray-600">Accuracy Rate</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                <Image
                  src="/TBLP/24-7.svg"
                  alt="Processing"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-[#003366] mb-2">24/7</div>
                <div className="text-gray-600">Processing</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                <Image
                  src="/TBLP/SOC 2.svg"
                  alt="Compliance"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-[#003366] mb-2">SOC 2</div>
                <div className="text-gray-600">Compliant</div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                <Image
                  src="/TBLP/10K+.svg"
                  alt="Files Processed"
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-[#003366] mb-2">10k+</div>
                <div className="text-gray-600">Files Processed</div>
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
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-[#003366]/80"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Get Accurate Transcripts or Fully Prepared Documents — Without the Back-and-Forth
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            <span className="block mb-4"><strong>Transcription:</strong> Convert audio into structured transcripts.</span>
            <span className="block"><strong>Dictation:</strong> Upload instructions/templates and receive finished documents.</span>
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

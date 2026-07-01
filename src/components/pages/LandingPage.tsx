"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, CheckCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const serviceChooserCards = [
  {
    title: 'I need audio or video transcribed',
    text: 'Choose AI, Hybrid, or Human transcription for meetings, interviews, recordings, notes, or video files.',
    actions: [
      {
        label: 'Go to Transcript Workspace',
        href: '/transcript-workspace',
      },
    ],
  },
  {
    title: 'I have handwritten notes that need typing',
    text: 'Upload readable handwriting, scans, images, or PDFs and receive a clean typed document.',
    actions: [
      {
        label: 'Handwriting Transcription',
        href: '/handwriting-transcription',
      },
    ],
  },
  {
    title: 'I have a PDF, scan, or typed draft that needs retyping',
    text: 'Use copy typing for scanned documents, typed drafts, PDFs, image-based text, or notes that need to be typed into a clean document.',
    actions: [
      {
        label: 'Copy Typing Services',
        href: '/copy-typing-services',
      },
    ],
  },
  {
    title: 'I have audio instructions for a document',
    text: 'Upload a recording explaining what document you need prepared, along with any notes, templates, scans, or reference files.',
    actions: [
      {
        label: 'Audio Instructions for Document Preparation',
        href: '/audio-instructions-document-preparation',
      },
    ],
  },
  {
    title: 'I need a business or academic transcript',
    text: 'Use transcription services for business meetings, interviews, lectures, research recordings, seminars, or professional audio/video files.',
    actions: [
      {
        label: 'Business Transcription',
        href: '/business-transcription',
      },
      {
        label: 'Academic Transcription',
        href: '/academic-transcription',
      },
    ],
  },
  {
    title: 'I am not sure what to choose',
    text: 'Send us a message and we can help you choose the right service.',
    actions: [
      {
        label: 'Contact Us',
        href: '/contact',
      },
    ],
  },
];

const signupSteps = [
  'Create your secure account for free.',
  'Upload your file or instructions.',
  'Track your project from your dashboard.',
  'Download your completed transcript or document when ready.',
];

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
                Canadian Transcription & Document Preparation Services
              </h1>
              <p className="text-lg md:text-xl text-gray-300 mb-4 max-w-xl mx-auto lg:mx-0">
                Turn audio, video, handwritten notes, scanned documents, and typed drafts into clean transcripts and organized documents.
              </p>

              <div className="max-w-xl mx-auto lg:mx-0 mb-6 rounded-3xl border border-white/20 bg-white/15 p-5 text-left shadow-lg backdrop-blur-sm">
                <p className="text-xl font-semibold text-white mb-2">
                  Open your free account and try AI transcription for free.
                </p>
                <p className="text-base text-gray-100 mb-5">
                  Your first 60 minutes of AI transcription are free and include access to the built-in transcript editor. No credit card required.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button asChild className="bg-[#b29dd9] hover:bg-[#9d87c7] text-white">
                    <Link href="/signup">Create Free Account</Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-white !bg-white !text-[#003366] hover:!bg-gray-50 hover:!text-[#003366]"
                  >
                    <Link href="/pricing">View Pricing</Link>
                  </Button>
                  <Button
                    asChild
                    variant="ghost"
                    className="text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link href="/contact">Ask a Question</Link>
                  </Button>
                </div>
              </div>

              <div className="max-w-xl mx-auto lg:mx-0 mb-8 rounded-3xl bg-white/10 p-5 text-left">
                <p className="text-lg font-semibold text-white mb-3">
                  More accurate transcripts. Less time waiting. Built-in editing tools ready when you need them.
                </p>
                <p className="text-base text-gray-200">
                  Talk to Text Canada also offers typing services for everyday office needs, including copy typing, handwriting transcription, audio instructions for document preparation, and document preparation.
                </p>
              </div>

              <p className="text-base text-gray-200 mb-8 max-w-xl mx-auto lg:mx-0">
                Upload your file, choose the service you need, and download a polished transcript, letter, note, report, memo, or editable document.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto lg:mx-0 mb-10 text-left">
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#b29dd9] mb-2">Step 1</p>
                  <p className="font-semibold text-white">Upload audio, video, notes, scans, handwriting, or drafts</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#b29dd9] mb-2">Step 2</p>
                  <p className="font-semibold text-white">Choose transcription, copy typing, handwriting transcription, audio instructions, or document preparation</p>
                </div>
                <div className="rounded-3xl bg-white/10 p-4">
                  <p className="text-sm uppercase tracking-[0.2em] text-[#b29dd9] mb-2">Step 3</p>
                  <p className="font-semibold text-white">Download a clean transcript or editable document</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="bg-[#b29dd9] hover:bg-[#9d87c7] text-white text-lg px-15 py-4"
                >
                  <Link href="/signin">
                    Start a Project
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

      {/* Service Chooser Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-[#b29dd9] uppercase tracking-wide mb-3">
              Service chooser
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Not sure where to start?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Choose the option that best matches your file or project.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {serviceChooserCards.map((card) => (
              <Card key={card.title} className="border border-gray-200 shadow-sm hover:shadow-lg transition-shadow">
                <CardContent className="p-6 flex h-full flex-col">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0ebf8]">
                    <FileText className="h-6 w-6 text-[#003366]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#003366] mb-3">{card.title}</h3>
                  <p className="text-gray-600 mb-6 flex-1">{card.text}</p>
                  <div className="flex flex-col gap-3">
                    {card.actions.map((action) => (
                      <Button
                        key={action.href}
                        asChild
                        className="w-full bg-[#003366] hover:bg-[#002244] text-white"
                      >
                        <Link href={action.href}>
                          {action.label}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Visitor Pathway Section */}
      <section className="bg-[#f7f4fb] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <Card className="border border-[#e5dff2] shadow-sm">
              <CardContent className="p-8 md:p-10 h-full">
                <p className="text-sm font-semibold text-[#72629E] uppercase tracking-wide mb-3">
                  Take your time
                </p>
                <h2 className="text-3xl font-bold text-[#003366] mb-4">
                  Not ready to upload yet?
                </h2>
                <p className="text-gray-700 mb-6">
                  You can view pricing, ask a question, or create a secure account when you are ready.
                  If you are not sure which service fits your file, contact Talk to Text Canada before
                  submitting a project.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Button asChild variant="outline" className="border-[#003366] text-[#003366] hover:bg-[#f0ebf8]">
                    <Link href="/pricing">View Pricing</Link>
                  </Button>
                  <Button asChild variant="outline" className="border-[#003366] text-[#003366] hover:bg-[#f0ebf8]">
                    <Link href="/contact">Ask a Question</Link>
                  </Button>
                  <Button asChild className="bg-[#003366] hover:bg-[#002244] text-white">
                    <Link href="/signup">Create Free Account</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-[#e5dff2] shadow-sm">
              <CardContent className="p-8 md:p-10 h-full">
                <h2 className="text-3xl font-bold text-[#003366] mb-4">
                  What happens after signup?
                </h2>
                <p className="text-gray-700 mb-6">
                  Creating an account lets you upload and manage your projects securely. There is no
                  obligation to continue until you choose a service or submit a project.
                </p>
                <ol className="space-y-4">
                  {signupSteps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#003366] text-sm font-semibold text-white">
                        {index + 1}
                      </span>
                      <span className="pt-1 text-gray-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Services for Clean, Organized Documents
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Send the material you have. We help turn it into the document you need.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Image src="/images/AI.svg" alt="AI Transcription" width={48} height={48} className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">Transcription Services</h3>
                <p className="text-gray-600 mb-6">
                  Audio and video transcription with AI, hybrid, or human review options.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />AI, hybrid, and human options</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Editable transcripts</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />PDF, DOCX, TXT, SRT, VTT</li>
                </ul>

                <Button asChild className="mt-6 w-full bg-[#003366] hover:bg-[#002244] text-white">
                  <Link href="/pricing?service=ai">
                    View Transcription Pricing
                  </Link>
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Image src="/images/Human.svg" alt="Human Transcription" width={48} height={48} className="w-12 h-12" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">Audio Instructions to Document</h3>
                <p className="text-gray-600 mb-6">
                  Audio instructions turned into notes, letters, reports, summaries, and memos.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Instructions cleaned up</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Professional document formatting</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Editable document delivery</li>
                </ul>

                  <Button asChild className="mt-6 w-full bg-[#003366] hover:bg-[#002244] text-white">
                    <Link href="/pricing#document-workspace">
                      View Document Pricing
                    </Link>
                  </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <Image src="/images/Hybrid.svg" alt="Hybrid Review" width={56} height={56} className="w-14 h-14" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">Copy Typing</h3>
                <p className="text-gray-600 mb-6">
                  Scanned documents, PDFs, images, and typed drafts recreated as clean editable documents.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />PDFs and scanned pages</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Clean formatting</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Editable final files</li>
                </ul>

                <Button asChild className="mt-6 w-full bg-[#003366] hover:bg-[#002244] text-white">
                  <Link href="/pricing#document-workspace">
                    View Pricing
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow ring-2 ring-[#b29dd9]">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-[#b29dd9] rounded-full flex items-center justify-center mx-auto mb-6">
                  <FileText className="h-9 w-9 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-[#003366] mb-4">Handwriting Transcription</h3>
                <p className="text-gray-600 mb-6">
                  Handwritten notes, letters, file notes, and forms typed into readable digital documents.
                </p>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Notes and letters typed</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Readable formatting</li>
                  <li className="flex items-center"><CheckCircle className="h-4 w-4 text-green-500 mr-2" />Digital document delivery</li>
                </ul>

                <Button asChild className="mt-6 w-full bg-[#72629E] hover:bg-[#5D5186] text-white">
                  <Link href="/pricing#document-workspace">
                    View Document Services
                  </Link>
                </Button>
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
              Built for Professional Service Work
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Secure, confidential, and designed for practical transcription and document preparation.
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

      {/* Document Workspace CTA Section */}
      <section className="py-24 bg-gradient-to-br from-[#f0ebf8] to-[#e8e0f2]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#003366] rounded-full mb-6">
              <FileText className="h-8 w-8 text-[#b29dd9]" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Document Workspace — Audio Instructions, Notes, Scans and Drafts
            </h2>
            <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
              Upload audio instructions, notes, scanned documents, handwritten pages, audio, video, or typed drafts. We help turn them into clean, editable documents you can review, save, and download. If you only need audio or video converted into text, use AI Transcription instead.
            </p>
            <Button
              asChild
              size="lg"
              className="bg-[#003366] hover:bg-[#002244] text-white text-lg px-12 py-4"
            >
              <Link href="/document-workspace">
                Explore Document Workspace
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
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
            Get the Document You Need
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            <span className="block mb-4"><strong>Transcription:</strong> Convert audio or video into structured transcripts with AI, human, or hybrid options.</span>
            <span className="block"><strong>Documents:</strong> Send audio instructions, scanned pages, handwriting, notes, or drafts and receive a clean document for review and download.</span>
          </p>
          <p className="text-sm text-gray-200 mb-8 max-w-3xl mx-auto">
            Talk to Text Canada provides transcription, copy typing, formatting, and document preparation support. We do not provide legal advice, legal representation, or certified court reporting services. Clients are responsible for reviewing and approving all final documents before use.
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

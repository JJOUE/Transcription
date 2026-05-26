'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PricingSettings, getPricingSettings } from '@/lib/firebase/settings';
import {
  Upload,
  CreditCard,
  FileAudio,
  Settings,
  Users,
  ChevronDown,
  ChevronRight,
  Globe,
  Mic,
  FileText,
  Download,
  Share2,
  Edit,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Zap,
  Shield,
  Languages
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface FAQItem {
  question: string;
  answer: string;
}

const getFaqItems = (pricingSettings: PricingSettings | null): FAQItem[] => [
  {
    question: "What audio and video formats are supported?",
    answer: "We support most common audio formats (MP3, WAV, M4A, FLAC) and video formats (MP4, MOV, AVI). Files up to 1GB can be uploaded."
  },
  {
    question: "How accurate is the AI transcription?",
    answer: "Our AI transcription achieves 95%+ accuracy for clear audio in English and French. Accuracy depends on audio quality, background noise, and speaker clarity."
  },
  {
    question: "What's the difference between AI, Hybrid, and Human transcription?",
    answer: "AI transcription is fully automated and delivers results within an hour. Hybrid combines AI with human review for higher accuracy (3-5 business days). Human transcription is done entirely by professionals for maximum accuracy (3-5 business days)."
  },
  {
    question: "How does pricing work?",
    answer: `We use a wallet-based system. You can purchase discounted minute packages (300, 750, or 1500 minutes) or add funds to your wallet for pay-as-you-go. Packages include FREE rush delivery and multiple speaker detection. Standard rates: AI CA$${(pricingSettings?.payAsYouGo.ai || 0.40).toFixed(2)}/min, Hybrid CA$${(pricingSettings?.payAsYouGo.hybrid || 1.50).toFixed(2)}/min, Human CA$${(pricingSettings?.payAsYouGo.human || 2.50).toFixed(2)}/min. Package rates are significantly lower, starting at CA$0.30/min for AI.`
  },
  {
    question: "Can I edit the transcript after it's completed?",
    answer: "Yes! All transcripts can be edited directly in the viewer. You can correct errors, update speaker names, and make any necessary changes. Changes are saved automatically."
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. All files are encrypted in transit and at rest. We use Firebase's secure infrastructure and follow industry best practices for data protection."
  },
  {
    question: "Can I share transcripts with others?",
    answer: "Yes, you can generate shareable links for any transcript. Recipients don't need an account to view shared transcripts."
  },
  {
    question: "Do you support languages other than English?",
    answer: "Yes! We currently support Canadian English and French for AI transcription. More languages are coming soon."
  }
];

export default function GuidePage() {
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);

  // Load pricing settings from database
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const settings = await getPricingSettings();
        setPricingSettings(settings);
      } catch (error) {
        console.error('Error loading pricing settings:', error);
      }
    };
    loadPricing();
  }, []);

  const faqItems = getFaqItems(pricingSettings);

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-[#003366] mb-4">
            How to Use Talk to Text
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Get started with our transcription service in minutes. Watch the video tutorial or follow our step-by-step guide below.
          </p>
        </div>

        {/* Workspace Tutorial Placeholder */}
        <Card className="mb-12 overflow-hidden shadow-lg">
          <CardHeader className="bg-gradient-to-r from-[#003366] to-[#b29dd9] text-white">
            <div>
              <CardTitle className="text-2xl">Updated Workspace Tutorial Coming Soon</CardTitle>
              <CardDescription className="text-gray-100">
                We are updating this guide to reflect the new Talk to Text Canada workspace
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-8 bg-gray-50">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#b29dd9] bg-opacity-20 rounded-lg mb-4">
                <FileText className="h-8 w-8 text-[#003366]" />
              </div>
              <p className="text-gray-700 mb-4">
                We are updating this guide to reflect the new Talk to Text Canada workspace, including AI transcription, transcript styles, Document Workspace, AI Assist tools, and professional document workflows.
              </p>
              <p className="text-gray-600 text-sm">
                In the meantime, use the written guide below to learn how to upload files, choose options, edit transcripts, and download completed work.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Steps */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-[#003366] mb-6">Quick Start Guide</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-t-4 border-t-[#b29dd9]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="bg-[#b29dd9] text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    1
                  </div>
                  <Upload className="h-6 w-6 text-[#b29dd9]" />
                </div>
                <CardTitle className="mt-4">Upload Your File</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Drag and drop or browse to select your audio/video file. Files up to 1GB are supported.
                </p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-[#b29dd9]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="bg-[#b29dd9] text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    2
                  </div>
                  <Settings className="h-6 w-6 text-[#b29dd9]" />
                </div>
                <CardTitle className="mt-4">Choose Options</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Select transcription mode (AI/Hybrid/Human), language, and any special requirements.
                </p>
              </CardContent>
            </Card>

            <Card className="border-t-4 border-t-[#b29dd9]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="bg-[#b29dd9] text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                    3
                  </div>
                  <FileText className="h-6 w-6 text-[#b29dd9]" />
                </div>
                <CardTitle className="mt-4">Get Your Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Receive your completed transcript. Edit, download, or share as needed.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Detailed Features */}
        <Tabs defaultValue="uploading" className="mb-12">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="uploading">Uploading</TabsTrigger>
            <TabsTrigger value="transcription">Transcription</TabsTrigger>
            <TabsTrigger value="editing">Editing</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="sharing">Sharing</TabsTrigger>
          </TabsList>

          <TabsContent value="uploading" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Uploading Files
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Step-by-Step Instructions:</h3>
                  <ol className="space-y-3 ml-4">
                    <li className="flex gap-3">
                      <span className="font-semibold text-[#b29dd9]">1.</span>
                      <span>Navigate to the Upload page from your dashboard</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-[#b29dd9]">2.</span>
                      <span>Drag and drop your file or click "Browse Files" to select</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-[#b29dd9]">3.</span>
                      <span>Wait for the duration to be calculated (shows estimated cost)</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-[#b29dd9]">4.</span>
                      <span>Add multiple files if needed - they'll be processed together</span>
                    </li>
                  </ol>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900">Pro Tip:</p>
                      <p className="text-blue-800 text-sm mt-1">
                        For best results, use high-quality audio with minimal background noise. If your file has multiple speakers, our AI will automatically detect and label them.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Supported Formats:</h4>
                  <div className="flex flex-wrap gap-2">
                    {['MP3', 'WAV', 'M4A', 'FLAC', 'MP4', 'MOV', 'AVI'].map(format => (
                      <span key={format} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transcription" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Transcription Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Transcription Modes */}
                <div>
                  <h3 className="font-semibold text-lg mb-4">Choose the Right Mode:</h3>
                  <div className="space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-yellow-500 mt-0.5" />
                        <div>
                          <h4 className="font-semibold">AI Transcription</h4>
                          <p className="text-gray-600 text-sm mt-1">Fast automated transcription with 95%+ accuracy</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="text-green-600">✓ 60 minutes turnaround</span>
                            <span className="text-green-600">✓ From CA$0.30/minute</span>
                            <span className="text-green-600">✓ Speaker detection</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <h4 className="font-semibold">Hybrid Review</h4>
                          <p className="text-gray-600 text-sm mt-1">AI transcription with human quality check</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="text-blue-600">✓ 3-5 business days</span>
                            <span className="text-blue-600">✓ From CA$1.20/minute</span>
                            <span className="text-blue-600">✓ 98%+ accuracy</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-purple-500 mt-0.5" />
                        <div>
                          <h4 className="font-semibold">Human Transcription</h4>
                          <p className="text-gray-600 text-sm mt-1">Professional transcribers for maximum accuracy</p>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="text-purple-600">✓ 3-5 business days</span>
                            <span className="text-purple-600">✓ From CA$2.00/minute</span>
                            <span className="text-purple-600">✓ 99%+ accuracy</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Language Options */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Languages className="h-5 w-5" />
                    Language Support
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🇨🇦</span>
                        <h4 className="font-semibold">Canadian English</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Optimized for Canadian accents and vocabulary
                      </p>
                    </div>
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">🇫🇷</span>
                        <h4 className="font-semibold">French</h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        Supports both Canadian and European French
                      </p>
                    </div>
                  </div>
                </div>

                {/* Domain Options */}
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">Specialized Domains:</h3>
                  <p className="text-gray-600 mb-4">Select a domain for enhanced vocabulary recognition:</p>
                  <div className="flex gap-3">
                    <span className="px-4 py-2 bg-gray-100 rounded-lg">🌐 General</span>
                    <span className="px-4 py-2 bg-gray-100 rounded-lg">🏥 Medical</span>
                    <span className="px-4 py-2 bg-gray-100 rounded-lg">⚖️ Legal</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="editing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Editing Transcripts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3">Edit Mode Features:</h3>
                  <ul className="space-y-2 ml-4">
                    <li className="flex gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Click on any text to edit directly inline</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Text is grouped by speaker for easy editing</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Select multiple lines to edit large sections</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Changes are saved automatically</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <span>Rename speakers with custom names</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <HelpCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-yellow-900">Keyboard Shortcuts:</p>
                      <div className="text-yellow-800 text-sm mt-1 space-y-1">
                        <div><kbd className="px-2 py-1 bg-yellow-100 rounded">Ctrl+S</kbd> Save changes</div>
                        <div><kbd className="px-2 py-1 bg-yellow-100 rounded">Ctrl+Z</kbd> Undo last edit</div>
                        <div><kbd className="px-2 py-1 bg-yellow-100 rounded">Ctrl+F</kbd> Find text</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Export Options:</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" size="sm" className="justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      DOCX (Word Document)
                    </Button>
                    <Button variant="outline" size="sm" className="justify-start">
                      <FileText className="h-4 w-4 mr-2" />
                      PDF (Portable Document)
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    Export your transcripts as professionally formatted documents with timestamps, speaker labels, and metadata.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Wallet & Billing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold text-lg mb-3">How Our Wallet System Works:</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 mb-3">
                      1. Add funds to your wallet or purchase discounted minute packages<br />
                      2. Upload files - costs are automatically deducted from your wallet<br />
                      3. Package buyers get FREE rush delivery & multiple speaker detection!
                    </p>
                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between items-center">
                        <span>AI Transcription</span>
                        <span className="font-semibold">CA$0.30-${(pricingSettings?.payAsYouGo.ai || 0.40).toFixed(2)}/minute</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Hybrid Review</span>
                        <span className="font-semibold">CA$1.20-${(pricingSettings?.payAsYouGo.hybrid || 1.50).toFixed(2)}/minute</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Human Transcription</span>
                        <span className="font-semibold">CA$2.00-${(pricingSettings?.payAsYouGo.human || 2.50).toFixed(2)}/minute</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-3">Purchase Options:</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Minute Packages
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Best value with FREE add-ons included!
                      </p>
                      <ul className="text-sm mt-3 space-y-1">
                        <li>• 300 minutes: From CA$100 (AI)</li>
                        <li>• 750 minutes: From CA$240 (AI)</li>
                        <li>• 1500 minutes: From CA$450 (AI)</li>
                        <li className="text-green-600 font-semibold">✓ FREE rush delivery</li>
                        <li className="text-green-600 font-semibold">✓ FREE multiple speakers</li>
                      </ul>
                    </div>
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Wallet Top-up
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Flexibility with standard rates
                      </p>
                      <ul className="text-sm mt-3 space-y-1">
                        <li>• CA$50 - Starter wallet</li>
                        <li>• CA$200 - Professional wallet</li>
                        <li>• CA$500 - Enterprise wallet</li>
                        <li className="text-gray-500">• Add-ons cost extra</li>
                        <li className="text-gray-500">• Standard per-minute rates</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 text-sm">
                    💡 <strong>Pro Tip:</strong> Packages offer up to 50% savings PLUS free add-ons worth hundreds of dollars. Packages expire after 30 days, while wallet funds never expire.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sharing" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="h-5 w-5" />
                  Sharing Transcripts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-3">How to Share:</h3>
                  <ol className="space-y-3 ml-4">
                    <li className="flex gap-3">
                      <span className="font-semibold text-[#b29dd9]">1.</span>
                      <span>Open the transcript you want to share</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-[#b29dd9]">2.</span>
                      <span>Click the "Share" button in the top toolbar</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-[#b29dd9]">3.</span>
                      <span>Toggle "Enable sharing" to generate a link</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="font-semibold text-[#b29dd9]">4.</span>
                      <span>Copy the link and send it to anyone</span>
                    </li>
                  </ol>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Share Features:</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Recipients don't need an account</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Shared transcripts are read-only</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Audio playback works on shared links</span>
                    </li>
                    <li className="flex gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Disable sharing anytime to revoke access</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800 text-sm">
                    🔒 <strong>Privacy:</strong> Only people with the link can view shared transcripts.
                    They are not indexed by search engines.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* FAQ Section */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Frequently Asked Questions</CardTitle>
            <CardDescription>
              Quick answers to common questions
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
                    <div className="px-4 pb-3">
                      <p className="text-gray-600">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card className="bg-gradient-to-r from-[#003366] to-[#b29dd9] text-white">
          <CardHeader>
            <CardTitle className="text-2xl">Still Need Help?</CardTitle>
            <CardDescription className="text-gray-100">
              Our support team is here to assist you
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="secondary"
                size="lg"
                className="bg-white text-[#003366] hover:bg-gray-100"
                onClick={() => window.location.href = '/contact'}
              >
                <HelpCircle className="h-5 w-5 mr-2" />
                Contact Support
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="bg-white text-[#003366] hover:bg-gray-100"
                onClick={() => window.location.href = 'mailto:support@talktotext.ai'}
              >
                Email Us
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
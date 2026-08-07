"use client";

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Check, Star, Clock, Users, Zap, CreditCard, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { usePackages } from '@/contexts/PackageContext';
import { TranscriptionPackage } from '@/lib/firebase/packages';
import { PricingSettings, getPricingSettings } from '@/lib/firebase/settings';

// Declare stripe-pricing-table as a valid HTML element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id': string;
          'publishable-key': string;
        },
        HTMLElement
      >;
    }
  }
}

export function PricingPage() {
  const searchParams = useSearchParams();
  const [selectedTab, setSelectedTab] = useState('ai');
  const { activePackages, loading } = usePackages();
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);

  const selectPricingTab = React.useCallback((value: string | null) => {
    const tabMap: Record<string, string> = {
      ai: 'ai',
      hybrid: 'hybrid',
      human: 'human',
      dictation: 'dictation',
      documents: 'dictation',
      'document-workspace': 'dictation',
    };

    if (value && tabMap[value]) {
      setSelectedTab(tabMap[value]);
    }
  }, []);

  useEffect(() => {
    selectPricingTab(searchParams.get('service'));
  }, [searchParams, selectPricingTab]);

  useEffect(() => {
    const selectTabFromHash = () => {
      selectPricingTab(window.location.hash.replace('#', ''));
    };

    selectTabFromHash();
    window.addEventListener('hashchange', selectTabFromHash);

    return () => window.removeEventListener('hashchange', selectTabFromHash);
  }, [selectPricingTab]);

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

  // Group packages by type
  const packagesByType = {
    ai: activePackages.filter(pkg => pkg.type === 'ai').sort((a, b) => a.minutes - b.minutes),
    hybrid: activePackages.filter(pkg => pkg.type === 'hybrid').sort((a, b) => a.minutes - b.minutes),
    human: activePackages.filter(pkg => pkg.type === 'human').sort((a, b) => a.minutes - b.minutes),
    dictation: []
  };

  // Add-ons data
  const addOns = [
    {
      type: 'Rush Delivery',
      description: 'Available for Hybrid and Human Transcription only',
      hybrid: '+$0.50/minute',
      human: '+$0.75/minute'
    },
    {
      type: 'Multiple Speakers',
      description: 'Hybrid and Human only: no charge for 1 to 4 speakers; pay-as-you-go recordings with more than 4 may include a surcharge',
      hybrid: '+$0.25/minute',
      human: '+$0.30/minute'
    }
  ];

const getTypeInfo = (type: string) => {
  switch (type) {
    case 'ai':
      return {
        title: 'AI Transcription Packages',
        subtitle: 'For transcriptionists and experienced users who will review and edit the AI-generated transcript themselves',
        icon: Zap,
        label: 'AI Transcription'
      };

    case 'hybrid':
      return {
        title: 'Hybrid Transcription Packages',
        subtitle: 'AI transcription plus human review—we finish the transcript for you',
        icon: Users,
        label: 'Hybrid (AI + Human)'
      };

    case 'human':
      return {
        title: '100% Human Transcription Packages',
        subtitle: 'Human transcription from start to finish—we prepare the transcript for you',
        icon: Check,
        label: '100% Human'
      };

    case 'dictation':
      return {
        title: 'Document Workspace Pricing',
        subtitle: 'Document preparation from audio instructions, copy typing, handwriting transcription, and document formatting',
        icon: FileText,
        label: 'Document Workspace'
      };

    default:
      return null;
  }
};
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section
        className="relative text-white py-24"
        style={{
          backgroundImage: "url('/bg_1.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#003366]/80 to-[#2c3e50]/80"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Pricing for Transcription & Document Services
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Choose AI transcription, hybrid review, human transcription, audio instructions for document preparation, copy typing, handwriting transcription, or document preparation.
            Save with bundled packages or pay as you go.
          </p>
        </div>
      </section>

      {/* Main Pricing Section with Tabs */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex justify-center items-center py-24">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-4 mb-12">
                <TabsTrigger value="ai" className="flex items-center justify-center">
                  <Zap className="h-4 w-4 mr-2" />
                  AI Transcription
                </TabsTrigger>
                <TabsTrigger value="hybrid" className="flex items-center justify-center">
                  <Users className="h-4 w-4 mr-2" />
                  Hybrid (AI + Human)
                </TabsTrigger>
                <TabsTrigger value="human" className="flex items-center justify-center">
                  <Check className="h-4 w-4 mr-2" />
                  100% Human
                </TabsTrigger>
                <TabsTrigger value="dictation" className="flex items-center justify-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Document Workspace
                </TabsTrigger>
              </TabsList>

              {Object.entries(packagesByType).map(([type, packages]) => (
                <TabsContent
                  key={type}
                  value={type}
                  id={type === 'dictation' ? 'document-workspace' : type}
                >
                  {type === 'dictation' ? (
                  <div className="max-w-5xl mx-auto">
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-10">
                        <div className="text-center mb-10">
                          <h3 className="text-3xl font-bold text-[#003366] mb-4">
                            Document Workspace
                          </h3>
                          
                          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Document preparation from audio instructions, notes, handwriting, scans, PDFs, or drafts.
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                          <div>
                            <h4 className="text-xl font-semibold text-[#003366] mb-4">
                              How It Works
                            </h4>
                            
            <p className="text-gray-600 mb-6">
              Talk to Text Canada can help with transcription, document preparation from audio instructions, copy typing, handwriting transcription, and document formatting.
            </p>

            <p className="text-gray-600 mb-6">
              Upload audio instructions, notes, scanned documents, handwritten pages, audio, video, or typed drafts.
            </p>

            <p className="text-gray-600">
              We prepare a clean, editable document based on the service requested and your instructions.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-semibold text-[#003366] mb-4">
              Ideal For
            </h4>

            <ul className="space-y-3">
              {[
                'Letters',
                'File notes',
                'Reports',
                'Summaries',
                'Memos',
                'Copy typing',
                'Handwritten notes',
                'Scanned documents'
              ].map((item) => (
                <li key={item} className="flex items-center text-gray-600">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 p-6 bg-gray-50 rounded-2xl">
              <p className="text-sm uppercase tracking-[0.2em] text-[#72629E] mb-2">
                Starting at
              </p>
              
              <div className="text-3xl font-bold text-[#003366] mb-4">
                CA$25
              </div>
              
  <div className="space-y-2 text-sm text-gray-600">
    <p>Finished document preparation starts at CA$25. Pricing depends on the document type, length, template and formatting required.</p>
    <p>Letters, case notes, reports, memos, supplied templates, copy typing, handwriting and other finished documents require an administrator-approved quote.</p>
    <p>Transcript-only projects continue to use the transcription rates shown above.</p>
  </div>
</div>

</div>

</div>

<div className="text-center mt-10">
          <Button
            asChild
            className="bg-[#72629E] hover:bg-[#5D5186] text-white px-8 py-3"
          >
            <Link href="/signup">
              Start a Document Project
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
) : type === 'ai' ? (
  <div className="max-w-5xl mx-auto">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card className="border-0 shadow-lg"><CardContent className="p-8 text-center">
        <h3 className="text-2xl font-bold text-[#003366] mb-4">AI Transcription Only</h3>
        <div className="text-4xl font-bold text-[#b29dd9]">CA$0.05</div>
        <div className="text-gray-600 mb-4">per audio minute</div>
        <p className="text-gray-600">Best for transcriptionists and professional users who want a fast AI-generated draft to review and edit themselves.</p>
        <p className="text-sm text-gray-500 mt-3">You receive the AI-generated transcript and review/edit it yourself in Transcript Workspace.</p>
      </CardContent></Card>
      <Card className="border-0 shadow-lg"><CardContent className="p-8 text-center">
        <h3 className="text-2xl font-bold text-[#003366] mb-4">AI + Professional Editor</h3>
        <div className="text-4xl font-bold text-[#b29dd9]">CA$19.99<span className="text-base text-gray-600">/month</span></div>
        <div className="text-2xl font-bold text-[#003366] mt-3">CA$0.03/audio minute</div>
        <p className="text-gray-600 mt-4">For professional transcript editors who review and correct AI-generated transcripts themselves. Full Transcript Workspace tools plus a lower AI rate.</p>
      </CardContent></Card>
    </div>
    <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-2xl text-center">
      <strong>60 free AI transcription minutes</strong>
      <p className="text-gray-600 mt-1">The free 60 minutes include access to the full Transcript Workspace editor.</p>
    </div>
  </div>
) : packages.length === 0 ? (
  <div className="text-center py-12">
    <p className="text-gray-500">No packages available at the moment.</p>
  </div>
) : (
                    <>
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-[#003366] mb-2">
                          {getTypeInfo(type)?.title}
                        </h3>
                        <p className="text-gray-600">
                          {getTypeInfo(type)?.subtitle}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {packages.map((pkg) => (
                          <Card
                            key={pkg.id}
                            className={`relative border-0 shadow-lg hover:shadow-xl transition-shadow flex flex-col h-full ${
                              pkg.popular ? 'ring-2 ring-[#b29dd9] scale-105' : ''
                            }`}
                          >
                            {pkg.popular && (
                              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                <div className="bg-[#b29dd9] text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                                  <Star className="h-4 w-4 mr-1" />
                                  Most Popular
                                </div>
                              </div>
                            )}

                            <CardHeader className="text-center pb-4">
                              <CardTitle className="text-2xl font-bold text-[#003366]">
                                {pkg.name}
                              </CardTitle>
                              <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                              <p className="text-xs text-gray-500 mt-2">{pkg.minutes} minutes included</p>

                              <div className="mt-4">
                                <div className="flex items-center justify-center space-x-2">
                                  <span className="text-4xl font-bold text-[#003366]">
                                    CA${pkg.price}
                                  </span>
                                  {pkg.savingsPercentage > 0 && (
                                    <span className="text-lg text-gray-400 line-through">
                                      CA${(pkg.standardRate * pkg.minutes).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                  CA${pkg.perMinuteRate.toFixed(2)}/minute
                                </div>
                                {pkg.savingsPercentage > 0 && (
                                  <div className="text-green-600 font-medium text-sm mt-2">
                                    Save CA${pkg.savingsAmount.toFixed(2)} ({pkg.savingsPercentage.toFixed(0)}%)
                                  </div>
                                )}
                              </div>
                            </CardHeader>

                            <CardContent className="pt-0 flex-1 flex flex-col">
                              <ul className="space-y-2 mb-8 flex-1">
                                {pkg.features.map((feature, idx) => (
                                  <li key={idx} className="flex items-start">
                                    <Check className={`h-5 w-5 ${
                                      feature.includes('FREE') ? 'text-green-500' : 'text-green-500'
                                    } mr-2 flex-shrink-0 mt-0.5`} />
                                    <span className={`text-gray-600 text-sm ${
                                      feature.includes('FREE') ? 'font-medium' : ''
                                    }`}>{feature}</span>
                                  </li>
                                ))}
                              </ul>

                              <Button
                                asChild
                                className={`w-full mt-auto ${
                                  pkg.popular
                                    ? 'bg-[#b29dd9] hover:bg-[#9d87c7]'
                                    : 'bg-[#003366] hover:bg-[#002244]'
                                } text-white`}
                              >
                                <Link href="/signup">Sign Up Now</Link>
                              </Button>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </section>

      {/* Pay As You Go Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Pay As You Go
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Need flexibility? Pay only for what you use with our per-minute pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  AI Transcription Only
                </h3>
                <div className="text-3xl font-bold text-[#b29dd9] mb-1">
                  CA$0.05
                </div>
                <div className="text-gray-600">per audio minute</div>
                <p className="text-sm text-gray-500 mt-4">
                  Best for transcriptionists and professional users who want a fast AI-generated draft to review and edit themselves.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  You edit the AI transcript yourself in Transcript Workspace.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  Hybrid Review
                </h3>
                <div className="text-3xl font-bold text-[#b29dd9] mb-1">
                  CA${(pricingSettings?.payAsYouGo.hybrid || 1.50).toFixed(2)}
                </div>
                <div className="text-gray-600">per audio minute</div>
                <p className="text-sm text-gray-500 mt-4">
                  AI transcription followed by human review for accuracy, formatting, speaker labels, and transcript quality.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  We finish the transcript for you—you do not need to edit it yourself.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  Human Transcription
                </h3>
                <div className="text-3xl font-bold text-[#b29dd9] mb-1">
                  CA${(pricingSettings?.payAsYouGo.human || 2.50).toFixed(2)}
                </div>
                <div className="text-gray-600">per audio minute</div>
                <p className="text-sm text-gray-500 mt-4">
                  Your audio is transcribed and prepared by a human transcriptionist from start to finish.
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  We prepare the transcript for you without relying on AI-generated transcription.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button
              asChild
              variant="outline"
              className="mx-auto"
            >
              <Link href="/signup">
                <CreditCard className="h-4 w-4 mr-2" />
                Sign Up to Get Started
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Add-ons Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Premium Add-ons
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Available for Hybrid and Human Transcription. Charges are separate from transcription minutes.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {addOns.map((addon, index) => (
              <Card key={index} className="border-0 shadow-lg mb-6">
                <CardContent className="p-8">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold text-[#003366] mb-2">
                        {addon.type}
                      </h3>
                      <p className="text-gray-600">{addon.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Hybrid {addon.hybrid}</p>
                      <p className="text-sm text-gray-500">Human {addon.human}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Package minutes:</strong> Cover transcription duration only. Hybrid and Human rush delivery is paid separately through secure checkout. Recordings with more than four speakers require a custom quote.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pay-as-you-go Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Pay as you go
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Purchase transcription service without choosing a minute package
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-3xl font-bold text-[#003366] mb-2">
                  CA$50
                </div>
                <p className="text-gray-600 mb-4">Small pay-as-you-go project</p>
                <div className="text-xs text-gray-500 mt-4">
                  Available for customers
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-3xl font-bold text-[#003366] mb-2">
                  CA$200
                </div>
                <p className="text-gray-600 mb-4">Ongoing pay-as-you-go work</p>
                <div className="text-xs text-gray-500 mt-4">
                  Available for customers
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-3xl font-bold text-[#003366] mb-2">
                  CA$500
                </div>
                <p className="text-gray-600 mb-4">Larger pay-as-you-go projects</p>
                <div className="text-xs text-gray-500 mt-4">
                  Available for customers
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Comparison */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Compare Features
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white rounded-lg shadow-lg">
              <thead>
                <tr className="bg-[#003366] text-white">
                  <th className="p-4 text-left">Feature</th>
                  <th className="p-4 text-center">AI</th>
                  <th className="p-4 text-center">Hybrid</th>
                  <th className="p-4 text-center">Human</th>
                  <th className="p-4 text-center">Document Workspace</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 font-semibold">Accuracy</td>
                  <td className="p-4 text-center">95%+</td>
                  <td className="p-4 text-center">98%+</td>
                  <td className="p-4 text-center">99%+</td>
                  <td className="p-4 text-center">Document preparation</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">Turnaround Time</td>
                  <td className="p-4 text-center">60 minutes</td>
                  <td className="p-4 text-center">3-5 business days</td>
                  <td className="p-4 text-center">3-5 business days</td>
                  <td className="p-4 text-center">1-5 business days</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-semibold">Speaker Detection</td>
                  <td className="p-4 text-center">✓</td>
                  <td className="p-4 text-center">✓</td>
                  <td className="p-4 text-center">✓</td>
                  <td className="p-4 text-center">N/A</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">Languages</td>
                  <td className="p-4 text-center">English, French</td>
                  <td className="p-4 text-center">English</td>
                  <td className="p-4 text-center">English</td>
                  <td className="p-4 text-center">English</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-semibold">Package Starting Price</td>
                  <td className="p-4 text-center font-bold text-[#b29dd9]">
                    {packagesByType.ai.length > 0 ?
                      `CA$${Math.min(...packagesByType.ai.map(p => p.perMinuteRate)).toFixed(2)}/min` :
                      'N/A'}
                  </td>
                  <td className="p-4 text-center font-bold text-[#b29dd9]">
                    {packagesByType.hybrid.length > 0 ?
                      `CA$${Math.min(...packagesByType.hybrid.map(p => p.perMinuteRate)).toFixed(2)}/min` :
                      'N/A'}
                  </td>
                  <td className="p-4 text-center font-bold text-[#b29dd9]">
                    {packagesByType.human.length > 0 ?
                      `CA$${Math.min(...packagesByType.human.map(p => p.perMinuteRate)).toFixed(2)}/min` :
                      'N/A'}
                  </td>
                  <td className="p-4 text-center font-bold text-[#b29dd9]">
                    CA$2.50/page
                  </td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">Pay As You Go Price</td>
                  <td className="p-4 text-center">CA$0.05/min (CA$0.03/min with Professional Editor)</td>
                  <td className="p-4 text-center">CA${(pricingSettings?.payAsYouGo.hybrid || 1.50).toFixed(2)}/min</td>
                  <td className="p-4 text-center">CA${(pricingSettings?.payAsYouGo.human || 2.50).toFixed(2)}/min</td>
                  <td className="p-4 text-center">Starting at CA$2.50/page</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                Do unused minutes expire?
              </h3>
              <p className="text-gray-600">
                No. Purchased package minutes remain available in your account until they are fully used.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                What's the difference between AI, Hybrid, and Human transcription?
              </h3>
              <p className="text-gray-600">
                AI Transcription gives transcriptionists and experienced users an AI-generated transcript to review and edit themselves.
                Hybrid Review combines AI transcription with human review, and we finish the transcript for you.
                Human Transcription is completed by a human transcriptionist from start to finish, and we prepare the transcript for you.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                Can I upgrade my package?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade anytime and unused minutes will be prorated to your new package.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                What file formats do you support?
              </h3>
              <p className="text-gray-600">
                We support all major audio and video formats including MP3, WAV, M4A, FLAC, MP4, MOV, and more.
                Maximum file size is 1GB.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                How does pay-as-you-go transcription work?
              </h3>
              <p className="text-gray-600">
                Choose your transcription service and submit a project without purchasing a package.
                The final amount depends on the audio minutes, selected service, and any order surcharge.
                AI Transcription has no rush or speaker surcharge. Hybrid and Human recordings with one to four speakers are included. Recordings with more than four speakers require a custom quote. Rush delivery is paid separately through secure checkout.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                Is there a volume discount?
              </h3>
              <p className="text-gray-600">
                Yes! Our bundled packages offer significant savings compared to pay-as-you-go rates.
                The more minutes you purchase, the lower the per-minute cost.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// Default export for Next.js pages compatibility
export default PricingPage;

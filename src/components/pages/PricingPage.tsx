"use client";

import React, { useState, useEffect } from 'react';
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
  const [selectedTab, setSelectedTab] = useState('ai');
  const { activePackages, loading } = usePackages();
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
      description: '24-48 hour turnaround',
      hybrid: '+$0.50/minute',
      human: '+$0.75/minute'
    },
    {
      type: 'Multiple Speakers',
      description: '3 or more speakers',
      hybrid: '+$0.25/minute',
      human: '+$0.30/minute'
    }
  ];

const getTypeInfo = (type: string) => {
  switch (type) {
    case 'ai':
      return {
        title: 'AI Transcription Packages',
        subtitle: 'Fast, automated transcription delivered within 60 minutes',
        icon: Zap,
        label: 'AI Transcription'
      };

    case 'hybrid':
      return {
        title: 'Hybrid Transcription Packages',
        subtitle: 'AI transcription with human review - delivered in 3-5 business days',
        icon: Users,
        label: 'Hybrid (AI + Human)'
      };

    case 'human':
      return {
        title: '100% Human Transcription Packages',
        subtitle: 'Professional human transcription - delivered in 3-5 business days',
        icon: Check,
        label: '100% Human'
      };

    case 'dictation':
      return {
        title: 'Dictation to Documents',
        subtitle: 'Upload dictated instructions and receive polished finished documents',
        icon: FileText,
        label: 'Dictation'
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
            Professional Transcription Pricing
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Choose from AI-powered, Hybrid, or 100% Human transcription services.
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
                  Dictation
                </TabsTrigger>
              </TabsList>

              {Object.entries(packagesByType).map(([type, packages]) => (
                <TabsContent key={type} value={type}>
                  {type === 'dictation' ? (
                  <div className="max-w-5xl mx-auto">
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-10">
                        <div className="text-center mb-10">
                          <h3 className="text-3xl font-bold text-[#003366] mb-4">
                            Dictation to Documents
                          </h3>
                          
                          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Have you ever needed documents typed up but didn’t have an assistant or the time to do it yourself?
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                          <div>
                            <h4 className="text-xl font-semibold text-[#003366] mb-4">
                              How It Works
                            </h4>
                            
            <p className="text-gray-600 mb-6">
              Talk to Text Canada can act as your transcription and dictation assistant.
            </p>

            <p className="text-gray-600 mb-6">
              Simply upload your dictated instructions and, if desired, upload your own template or explain how you would like the document formatted.
            </p>

            <p className="text-gray-600">
              We will prepare your document according to your instructions and return it as a polished, ready-to-use file.
            </p>
          </div>

          <div>
            <h4 className="text-xl font-semibold text-[#003366] mb-4">
              Ideal For
            </h4>

            <ul className="space-y-3">
              {[
                'Letters',
                'Case notes',
                'Reports',
                'Summaries',
                'Court documents',
                'Office correspondence'
              ].map((item) => (
                <li key={item} className="flex items-center text-gray-600">
                  <Check className="h-5 w-5 text-green-500 mr-3" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 p-6 bg-gray-50 rounded-2xl">
              <p className="text-sm uppercase tracking-[0.2em] text-[#72629E] mb-2">
                Starting At
              </p>

              <div className="text-4xl font-bold text-[#003366] mb-2">
                CA$1.75/min
              </div>

              <p className="text-sm text-gray-500">
                Minimum charge applies. Complex formatting or large projects may require custom pricing.
              </p>
            </div>
          </div>

        </div>

        <div className="text-center mt-10">
          <Button
            asChild
            className="bg-[#72629E] hover:bg-[#5D5186] text-white px-8 py-3"
          >
            <Link href="/signup">
              Start a Dictation Job
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
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
                  AI Only
                </h3>
                <div className="text-3xl font-bold text-[#b29dd9] mb-1">
                  CA${(pricingSettings?.payAsYouGo.ai || 0.40).toFixed(2)}
                </div>
                <div className="text-gray-600">/minute</div>
                <p className="text-sm text-gray-500 mt-4">
                  Fast automated transcription
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  No minimum commitment
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  Hybrid
                </h3>
                <div className="text-3xl font-bold text-[#b29dd9] mb-1">
                  CA${(pricingSettings?.payAsYouGo.hybrid || 1.50).toFixed(2)}
                </div>
                <div className="text-gray-600">/minute</div>
                <p className="text-sm text-gray-500 mt-4">
                  AI + Human review
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Pay only for what you use
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <h3 className="text-xl font-semibold text-[#003366] mb-4">
                  100% Human
                </h3>
                <div className="text-3xl font-bold text-[#b29dd9] mb-1">
                  CA${(pricingSettings?.payAsYouGo.human || 2.50).toFixed(2)}
                </div>
                <div className="text-gray-600">/minute</div>
                <p className="text-sm text-gray-500 mt-4">
                  Professional human transcription
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Maximum accuracy guaranteed
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
              <strong className="text-green-600">FREE with all packages</strong> • Additional charges apply for pay-as-you-go
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
                      <div className="mb-2">
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                          FREE with packages
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Pay-as-you-go: Hybrid {addon.hybrid}</p>
                      <p className="text-sm text-gray-500">Pay-as-you-go: Human {addon.human}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Package Benefit:</strong> All minute packages include rush delivery and multiple speaker detection at no additional cost. This benefit alone can save hundreds of dollars!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Wallet Top-up Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-[#003366] mb-4">
              Wallet Top-Up
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Pre-load your account with credits for add-on services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="border-0 shadow-lg">
              <CardContent className="p-8 text-center">
                <div className="text-3xl font-bold text-[#003366] mb-2">
                  CA$50
                </div>
                <p className="text-gray-600 mb-4">Starter wallet</p>
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
                <p className="text-gray-600 mb-4">Professional wallet</p>
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
                <p className="text-gray-600 mb-4">Enterprise wallet</p>
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
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-4 font-semibold">Accuracy</td>
                  <td className="p-4 text-center">95%+</td>
                  <td className="p-4 text-center">98%+</td>
                  <td className="p-4 text-center">99%+</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">Turnaround Time</td>
                  <td className="p-4 text-center">60 minutes</td>
                  <td className="p-4 text-center">3-5 business days</td>
                  <td className="p-4 text-center">3-5 business days</td>
                </tr>
                <tr className="border-b">
                  <td className="p-4 font-semibold">Speaker Detection</td>
                  <td className="p-4 text-center">✓</td>
                  <td className="p-4 text-center">✓</td>
                  <td className="p-4 text-center">✓</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">Languages</td>
                  <td className="p-4 text-center">English, French</td>
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
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-4 font-semibold">Pay As You Go Price</td>
                  <td className="p-4 text-center">CA${(pricingSettings?.payAsYouGo.ai || 0.40).toFixed(2)}/min</td>
                  <td className="p-4 text-center">CA${(pricingSettings?.payAsYouGo.hybrid || 1.50).toFixed(2)}/min</td>
                  <td className="p-4 text-center">CA${(pricingSettings?.payAsYouGo.human || 2.50).toFixed(2)}/min</td>
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
                Yes, package minutes expire after 30 days. Pay-as-you-go has no expiration.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-[#003366] mb-2">
                What's the difference between AI, Hybrid, and Human transcription?
              </h3>
              <p className="text-gray-600">
                AI is fully automated and fastest (within 1 hour). Hybrid combines AI with human review
                for better accuracy (3-5 business days). Human is 100% typed by professionals for maximum
                accuracy (3-5 business days).
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
                How does wallet credit work?
              </h3>
              <p className="text-gray-600">
                Wallet credits are used for add-on services like rush delivery or multiple speaker
                identification. Top up your wallet and we'll automatically deduct as needed.
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

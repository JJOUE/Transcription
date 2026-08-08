"use client";

import React, { useState, useEffect } from 'react';
import { CreditCard, Download, Clock, CheckCircle, ChevronLeft, ChevronRight, Zap, Users, Check, Star, Info, TrendingDown, Calendar, FileAudio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { usePackages } from '@/contexts/PackageContext';
import { useWallet } from '@/contexts/WalletContext';
import { secureApiClient } from '@/lib/secure-api-client';
import { Timestamp } from 'firebase/firestore';
import SecureCheckoutButton from '@/components/billing/SecureCheckoutButton';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { PricingSettings, getPricingSettings } from '@/lib/firebase/settings';

// Declare stripe-pricing-table as a valid HTML element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'pricing-table-id': string;
          'publishable-key': string;
          'customer-email'?: string;
          'customer-session-client-secret'?: string;
        },
        HTMLElement
      >;
    }
  }
}

export default function BillingPage() {
  const { user, userData } = useAuth();
  const { transactions, purchaseCredits } = useCredits();
  const { activePackages, loading: packagesLoading } = usePackages();
  const { freeTrialMinutes, freeTrialActive, freeTrialUsed, freeTrialTotal, refreshWallet } = useWallet();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('ai');
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [membership, setMembership] = useState({ active: false, aiRate: 0.05 });

  const loadMembership = React.useCallback(async () => {
    if (!user) return setMembership({ active: false, aiRate: 0.05 });
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/professional-editor/status', { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      const data = response.ok ? await response.json() : null;
      setMembership({ active: data?.active === true, aiRate: data?.aiRate === 0.03 ? 0.03 : 0.05 });
    } catch { setMembership({ active: false, aiRate: 0.05 }); }
  }, [user]);

  useEffect(() => { void loadMembership(); }, [loadMembership]);

  const startMembershipCheckout = async () => {
    if (!user) return;
    const token = await user.getIdToken();
    const response = await fetch('/api/professional-editor/checkout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const data = await response.json();
    if (!response.ok || !data.url) return toast({ title: 'Membership checkout unavailable', description: data.error, variant: 'destructive' });
    window.location.assign(data.url);
  };

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

  // Auto-refresh wallet data after successful Stripe checkout
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');

    if (success === 'true') {
      console.log('[Billing] Payment successful, refreshing wallet data...');

      // Give webhook a moment to process (1 second delay)
      setTimeout(async () => {
        try {
          await refreshWallet();
          console.log('[Billing] Wallet data refreshed successfully');

          toast({
            title: "Purchase Successful! 🎉",
            description: "Your package has been added to your account. Check your dashboard to see it.",
            duration: 6000,
          });
        } catch (error) {
          console.error('[Billing] Error refreshing wallet:', error);
        }
      }, 1000);

      // Clean up URL (remove success parameter)
      window.history.replaceState({}, document.title, '/billing');
    } else if (canceled === 'true') {
      toast({
        title: "Payment Canceled",
        description: "Your payment was canceled. No charges were made.",
        variant: "destructive",
        duration: 5000,
      });

      // Clean up URL
      window.history.replaceState({}, document.title, '/billing');
    }
  }, [refreshWallet, toast]);

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  const isTestMode = publishableKey.includes('pk_test');

  // Group packages by type from Firebase
  const packagesByType = {
    ai: activePackages.filter(pkg => pkg.type === 'ai').sort((a, b) => a.minutes - b.minutes),
    hybrid: activePackages.filter(pkg => pkg.type === 'hybrid').sort((a, b) => a.minutes - b.minutes),
    human: activePackages.filter(pkg => pkg.type === 'human').sort((a, b) => a.minutes - b.minutes)
  };

  // Pricing table IDs - different for test and live mode
  const pricingTables = isTestMode ? {
    // TEST MODE - These need to be created in your Stripe test dashboard
    ai: process.env.NEXT_PUBLIC_STRIPE_TEST_PRICING_TABLE_AI || '',
    hybrid: process.env.NEXT_PUBLIC_STRIPE_TEST_PRICING_TABLE_HYBRID || '',
    human: process.env.NEXT_PUBLIC_STRIPE_TEST_PRICING_TABLE_HUMAN || '',
  } : {
    // LIVE MODE - Require environment variables for production
    ai: process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_AI || '',
    hybrid: process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_HYBRID || '',
    human: process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_HUMAN || '',
  };

  // Wallet payment links - different for test and live mode
  const walletLinks = isTestMode ? {
    // TEST MODE - Use test payment links from environment or fallback to test UI
    '50': process.env.NEXT_PUBLIC_STRIPE_TEST_WALLET_LINK_50 || '#',
    '200': process.env.NEXT_PUBLIC_STRIPE_TEST_WALLET_LINK_200 || '#',
    '500': process.env.NEXT_PUBLIC_STRIPE_TEST_WALLET_LINK_500 || '#'
  } : {
    // LIVE MODE - Use environment variables for production links
    '50': process.env.NEXT_PUBLIC_STRIPE_WALLET_LINK_50 || '',
    '200': process.env.NEXT_PUBLIC_STRIPE_WALLET_LINK_200 || '',
    '500': process.env.NEXT_PUBLIC_STRIPE_WALLET_LINK_500 || ''
  };

  useEffect(() => {
    // Load Stripe Pricing Table script
    if (typeof window !== 'undefined' && !scriptsLoaded) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/pricing-table.js';
      script.async = true;
      script.onload = () => setScriptsLoaded(true);
      document.body.appendChild(script);

      return () => {
        // Cleanup
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [scriptsLoaded]);

  // Extract user data
  const minutesUsed = userData?.minutesUsedThisMonth || 0;

  // Calculate pagination
  const totalPages = Math.ceil(transactions.length / transactionsPerPage);
  const startIndex = (currentPage - 1) * transactionsPerPage;
  const endIndex = startIndex + transactionsPerPage;
  const currentTransactions = transactions.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  // Get package info for display (from Firebase data)
  const getTypeInfo = (type: string) => {
    switch (type) {
      case 'ai':
        return {
          name: 'AI Transcription',
          icon: Zap,
          description: 'Fast automated transcription (60 minute turnaround)',
          standardRate: membership.aiRate
        };
      case 'hybrid':
        return {
          name: 'Hybrid Transcription',
          icon: Users,
          description: 'AI + Human review (3-5 business days)',
          standardRate: pricingSettings?.payAsYouGo.hybrid || 1.50
        };
      case 'human':
        return {
          name: '100% Human',
          icon: Check,
          description: 'Professional human transcription (3-5 business days)',
          standardRate: pricingSettings?.payAsYouGo.human || 2.50
        };
      default:
        return null;
    }
  };

  const handleExportTransactions = () => {
    if (transactions.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no transactions to export.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ['Date', 'Type', 'Amount', 'Description'];
    const rows = transactions.map(tx => {
      const date = tx.createdAt instanceof Date ? tx.createdAt.toISOString() : tx.createdAt;
      return [
        date,
        tx.type,
        tx.amount.toString(),
        tx.description
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Your transaction history has been downloaded.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#003366]">Transcription Minutes & Billing</h1>
          <p className="text-gray-600 mt-2">Purchase transcription minutes and review your billing history</p>
        </div>

        {/* How It Works Section */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertTitle>How Our Prepaid System Works</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>1. <strong>Choose pay as you go</strong> or purchase a transcription minute package</p>
            <p>2. <strong>Upload files for transcription</strong> and review the service and order charges before submitting</p>
            <p>3. <strong>Use package minutes</strong> for the matching AI, Hybrid, or Human transcription service</p>
            <p className="text-sm text-gray-600 mt-3">
              <strong>Package minutes:</strong> Cover transcription duration only. Hybrid and Human rush delivery is paid separately through secure checkout. Recordings with more than four speakers require a custom quote.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Standard rates: AI ${membership.aiRate.toFixed(2)}/min • Hybrid ${pricingSettings?.payAsYouGo.hybrid.toFixed(2) || '1.50'}/min • Human ${pricingSettings?.payAsYouGo.human.toFixed(2) || '2.50'}/min
            </p>
          </AlertDescription>
        </Alert>

        <Card className="mb-8 border-2 border-[#b29dd9]">
          <CardHeader><CardTitle>Transcript Editor Membership</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-[#003366]">CA$19.99/month</p>
            <p className="mt-2">CA$0.03 per AI audio minute and full Transcript Workspace editing tools.</p>
            <p className="text-sm text-gray-500 mt-2">Your 60 free AI minutes remain separate and include full editor access.</p>
            <Button className="mt-4" onClick={startMembershipCheckout} disabled={membership.active}>
              {membership.active ? 'Transcript Editor Membership Active' : 'Start Transcript Editor Membership'}
            </Button>
          </CardContent>
        </Card>

        {/* Account Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* AI FREE TRIAL Card - Only show if trial is active */}
          {freeTrialActive && freeTrialMinutes > 0 && (
            <Card className="border-2 border-green-500 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-700">
                  🎉 Free AI Trial
                </CardTitle>
                <Star className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{freeTrialMinutes} AI minutes</div>
                <p className="text-xs text-gray-600 mt-1">
                  Used: {freeTrialUsed} of {freeTrialTotal} AI minutes
                </p>
                <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${((freeTrialTotal - freeTrialMinutes) / freeTrialTotal) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Minutes Used This Month
              </CardTitle>
              <Clock className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#003366]">{minutesUsed}</div>
              <p className="text-xs text-gray-500 mt-1">Reset on billing cycle</p>
            </CardContent>
          </Card>
        </div>

        {/* Purchase Options - Only 2 tabs now */}
        <Tabs defaultValue="packages" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="packages" className="relative">
              Minute Packages
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                BEST VALUE
              </span>
            </TabsTrigger>
            <TabsTrigger value="wallet">Pay as You Go</TabsTrigger>
          </TabsList>

          {/* Minute Packages Tab */}
          <TabsContent value="packages" className="space-y-4">
            <Card className="border-0 shadow">
              <CardHeader>
                <CardTitle className="text-xl">Discounted Minute Packages</CardTitle>
                <p className="text-sm text-gray-600">Save up to 50% when you purchase minutes in bulk</p>
              </CardHeader>
              <CardContent>
                {packagesLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner size="lg" />
                  </div>
                ) : (
                  <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                      <TabsTrigger value="ai" className="flex items-center justify-center gap-1">
                        <Zap className="h-4 w-4" />
                        <span className="hidden sm:inline">AI</span>
                      </TabsTrigger>
                      <TabsTrigger value="hybrid" className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4" />
                        <span className="hidden sm:inline">Hybrid</span>
                      </TabsTrigger>
                      <TabsTrigger value="human" className="flex items-center justify-center gap-1">
                        <Check className="h-4 w-4" />
                        <span className="hidden sm:inline">Human</span>
                      </TabsTrigger>
                    </TabsList>

                    {Object.entries(packagesByType).map(([key, packages]) => {
                      const typeInfo = getTypeInfo(key);
                      if (!typeInfo) return null;

                      return (
                        <TabsContent key={key} value={key}>
                          {packages.length === 0 ? (
                            <div className="text-center py-8">
                              <p className="text-gray-500">No packages available at the moment.</p>
                            </div>
                          ) : (
                            <>
                              <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold text-[#003366]">{typeInfo.name} Packages</h3>
                                <p className="text-sm text-gray-600 mt-1">{typeInfo.description}</p>
                                <p className="text-xs text-gray-500 mt-2">
                                  Standard rate: CA${typeInfo.standardRate.toFixed(2)}/minute
                                </p>
                              </div>

                              {/* Package cards from Firebase */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                {packages.map((pkg) => (
                                  <Card key={pkg.id} className={`border ${pkg.popular ? 'border-[#b29dd9] shadow-lg scale-105' : 'border-gray-200'} relative`}>
                                    {pkg.popular && (
                                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#b29dd9] text-white text-xs font-semibold px-4 py-1 rounded-full">
                                        MOST POPULAR
                                      </div>
                                    )}
                                    <CardContent className="p-6">
                                      {/* Best for badge */}
                                      <div className="text-center mb-4">
                                        <span className="inline-block bg-gray-100 text-gray-700 text-xs font-medium px-3 py-1 rounded-full">
                                          {pkg.bestFor}
                                        </span>
                                      </div>

                                      {/* Minutes and price */}
                                      <div className="text-center mb-4">
                                        <div className="text-2xl font-bold text-[#003366]">
                                          {pkg.minutes.toLocaleString()} minutes
                                        </div>
                                        <div className="text-3xl font-bold text-[#003366] mt-2">
                                          CA${pkg.price}
                                        </div>
                                        <div className="text-sm text-gray-600 mt-1">
                                          CA${pkg.perMinuteRate.toFixed(2)}/minute
                                        </div>
                                      </div>

                                      {/* Savings */}
                                      {pkg.savingsPercentage > 0 ? (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                          <div className="text-green-700 font-semibold text-sm">
                                            Save {pkg.savingsPercentage.toFixed(0)}%
                                          </div>
                                          <div className="text-green-600 text-xs mt-1">
                                            CA${pkg.savingsAmount.toFixed(0)} off standard rate
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
                                          <div className="text-gray-700 font-semibold text-sm">
                                            Standard Rate
                                          </div>
                                          <div className="text-gray-600 text-xs mt-1">
                                            No bulk discount
                                          </div>
                                        </div>
                                      )}

                                      {/* Additional info */}
                                      <div className="space-y-2 text-xs text-gray-600">
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center gap-1">
                                            <FileAudio className="h-3 w-3" />
                                            Estimate:
                                          </span>
                                          <span className="font-medium">{pkg.estimatedFiles}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            Valid for:
                                          </span>
                                          <span className="font-medium">{pkg.validity}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span className="flex items-center gap-1">
                                            <TrendingDown className="h-3 w-3" />
                                            Vs. standard:
                                          </span>
                                          <span className="font-medium text-green-600">
                                            -{((typeInfo.standardRate - pkg.perMinuteRate) / typeInfo.standardRate * 100).toFixed(0)}%
                                          </span>
                                        </div>
                                      </div>

                                      {/* What's included */}
                                      <div className="mt-4 pt-4 border-t border-gray-200">
                                        <div className="text-xs space-y-1">
                                          <div className="text-gray-700 font-semibold mb-1">All packages include:</div>
                                          <div className="text-gray-600">✓ {typeInfo.description.split('(')[0].trim()}</div>
                                          <div className="text-gray-600">✓ Export to DOCX & PDF</div>
                                          <div className="text-gray-600">✓ Speaker detection</div>
                                          {pkg.includesAddons && (
                                            <>
                                              <div className="text-green-600 font-medium">✓ FREE Rush delivery</div>
                                              <div className="text-green-600 font-medium">✓ Speaker add-on included</div>
                                              <div className="text-xs text-gray-500 italic mt-1">
                                                (Save up to CA$0.75/min on add-ons)
                                              </div>
                                            </>
                                          )}
                                          {key === 'ai' && (
                                            <div className="text-gray-500 italic mt-1">
                                              Rush delivery not needed (60 min turnaround)
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>

                              {/* Purchase Buttons */}
                              <div className="mt-6">
                                <h4 className="text-lg font-semibold text-[#003366] mb-4 text-center">Select Your Package:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  {packages.map((pkg) => (
                                    <div key={pkg.id} className="text-center">
                                      <SecureCheckoutButton
                                        amount={pkg.price}
                                        type="package"
                                        packageId={pkg.id}
                                        className={`w-full ${pkg.popular ? 'bg-[#b29dd9] hover:bg-[#9d87c7]' : 'bg-[#003366] hover:bg-[#002244]'} text-white py-3 px-4 rounded-lg font-medium transition-all`}
                                      >
                                        Purchase {pkg.minutes} Minutes
                                        <span className="block text-sm mt-1">CA${pkg.price}</span>
                                      </SecureCheckoutButton>
                                      {pkg.popular && (
                                        <p className="text-xs text-[#b29dd9] font-semibold mt-2">MOST POPULAR CHOICE</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                {isTestMode && (
                                  <p className="text-xs text-gray-500 text-center mt-4">
                                    Test Mode Active - Use card 4242 4242 4242 4242
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pay-as-you-go purchase tab */}
          <TabsContent value="wallet" className="space-y-4">
            <Card className="border-0 shadow">
              <CardHeader>
                <CardTitle className="text-xl">Buy Pay-as-You-Go Transcription</CardTitle>
                <p className="text-sm text-gray-600">
                  Purchase pay-as-you-go transcription at standard per-minute rates
                </p>
              </CardHeader>
              <CardContent>
                <Alert className="mb-6">
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Important:</strong> Pay-as-you-go purchases use the standard per-minute rates. Order surcharges are calculated separately.
                    <br />
                    <strong>Packages:</strong> Minutes cover transcription duration only. Contact support before submitting package work that needs rush service or has more than four speakers.
                  </AlertDescription>
                </Alert>

                {isTestMode ? (
                  <Alert className="mb-6 bg-yellow-50 border-yellow-200">
                    <Info className="h-4 w-4 text-yellow-700" />
                    <AlertTitle className="text-yellow-800">Test Mode - Pay-as-You-Go Purchase</AlertTitle>
                    <AlertDescription className="text-yellow-700">
                      Click any amount below to simulate a pay-as-you-go transcription purchase.
                      No real charges will occur. Use test card: 4242 4242 4242 4242
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['50', '200', '500'].map((amount) => (
                    <Card key={amount} className="border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-6 text-center">
                        <div className="text-3xl font-bold text-[#003366] mb-2">
                          CA${amount}
                        </div>
                        <p className="text-gray-600 mb-2">
                          {amount === '50' ? 'Quick Start' : amount === '200' ? 'Standard' : 'Professional'}
                        </p>
                        <p className="text-xs text-gray-500 mb-4">
                          ~{Math.floor(parseInt(amount) / membership.aiRate)} AI minutes<br/>
                          ~{Math.floor(parseInt(amount) / (pricingSettings?.payAsYouGo.hybrid || 1.50))} Hybrid minutes<br/>
                          ~{Math.floor(parseInt(amount) / (pricingSettings?.payAsYouGo.human || 2.50))} Human minutes
                        </p>
                        <SecureCheckoutButton
                          amount={parseInt(amount)}
                          type="wallet"
                          className="w-full bg-[#003366] hover:bg-[#002244] text-white py-3 rounded-lg font-medium"
                        >
                          Purchase CA${amount}
                        </SecureCheckoutButton>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-[#003366] mb-2">Standard Per-Minute Rates:</h4>
                  <div className="space-y-1 text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>AI Transcription:</span>
                      <span className="font-semibold">CA${membership.aiRate.toFixed(2)}/minute</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hybrid (AI + Human):</span>
                      <span className="font-semibold">CA${(pricingSettings?.payAsYouGo.hybrid || 1.50).toFixed(2)}/minute</span>
                    </div>
                    <div className="flex justify-between">
                      <span>100% Human:</span>
                      <span className="font-semibold">CA${(pricingSettings?.payAsYouGo.human || 2.50).toFixed(2)}/minute</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-2">⚠️ Add-On Charges (Pay-as-you-go only):</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Rush delivery (24-48 hours): <strong>+CA$0.50/min</strong> (Hybrid) or <strong>+CA$0.75/min</strong> (Human)</li>
                    <li>• Five or more speakers: <strong>+CA$0.25/min</strong> (Hybrid) or <strong>+CA$0.30/min</strong> (Human). One to four speakers have no extra speaker charge.</li>
                  </ul>
                  <p className="text-xs text-orange-800 mt-2 font-medium">
                    Hybrid and Human package add-ons are paid separately through secure checkout.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Transaction History */}
        <Card className="mt-8 border-0 shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Your recent purchases and usage</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTransactions}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {currentTransactions.length > 0 ? (
              <>
                <div className="space-y-3">
                  {currentTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          (transaction.type === 'wallet_topup' || transaction.type === 'package_purchase')
                            ? 'bg-green-100'
                            : 'bg-red-100'
                        }`}>
                          {(transaction.type === 'wallet_topup' || transaction.type === 'package_purchase') ? (
                            <CreditCard className="h-4 w-4 text-green-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.type === 'wallet_topup'
                              ? 'Pay-as-you-go transcription purchase'
                              : transaction.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {transaction.createdAt instanceof Date
                              ? transaction.createdAt.toLocaleDateString()
                              : transaction.createdAt?.toDate?.()
                              ? transaction.createdAt.toDate().toLocaleDateString()
                              : new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${
                        (transaction.type === 'wallet_topup' || transaction.type === 'package_purchase')
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {(() => {
                          // Format based on transaction type
                          if (transaction.type === 'wallet_topup') {
                            return `+CA$${transaction.amount.toFixed(2)}`;
                          }
                          if (transaction.type === 'package_purchase') {
                            return `+${transaction.packageMinutes || transaction.amount} minutes`;
                          }
                          if (transaction.type === 'transcription' || transaction.type === 'usage') {
                            // For transcription costs, show as negative currency
                            return `-CA$${transaction.amount.toFixed(2)}`;
                          }
                          // Fallback
                          return `CA$${transaction.amount.toFixed(2)}`;
                        })()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-700">
                      Showing {startIndex + 1} to {Math.min(endIndex, transactions.length)} of{' '}
                      {transactions.length} transactions
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          return page === 1 ||
                                 page === totalPages ||
                                 (page >= currentPage - 1 && page <= currentPage + 1);
                        })
                        .map((page, index, array) => (
                          <React.Fragment key={page}>
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="text-gray-400">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => goToPage(page)}
                              className={currentPage === page ? "bg-[#003366]" : ""}
                            >
                              {page}
                            </Button>
                          </React.Fragment>
                        ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No transactions yet</p>
                <p className="text-sm text-gray-400 mt-2">
                  Your purchase history will appear here
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

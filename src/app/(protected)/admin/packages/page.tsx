"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Trash2, Package, Star, Zap, Users, Check, TrendingDown, Calendar, FileAudio, Save, X, RefreshCw, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { usePackages } from '@/contexts/PackageContext';
import { TranscriptionPackage } from '@/lib/firebase/packages';
import { PricingSettings, getPricingSettings, updatePricingSettings, subscribeToPricingSettings } from '@/lib/firebase/settings';

export function PackageManager() {
  const { toast } = useToast();
  const {
    packages,
    loading,
    error,
    isAdmin,
    getPackagesByType,
    updateExistingPackage,
    deleteExistingPackage,
    toggleStatus,
    togglePopular,
    refreshPackages,
    initializeDefaults
  } = usePackages();

  const [selectedTab, setSelectedTab] = useState<'ai' | 'hybrid' | 'human'>('ai');
  const [editingPackage, setEditingPackage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<TranscriptionPackage>>({});

  // Pay-as-you-go pricing state
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [pricingFormData, setPricingFormData] = useState({ ai: 0, hybrid: 0, human: 0 });
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  // Load pricing settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await getPricingSettings();
        setPricingSettings(settings);
        setPricingFormData(settings.payAsYouGo);
      } catch (error) {
        console.error('Error loading pricing settings:', error);
      }
    };

    loadSettings();

    // Subscribe to changes
    const unsubscribe = subscribeToPricingSettings((settings) => {
      setPricingSettings(settings);
      if (!isEditingPricing) {
        setPricingFormData(settings.payAsYouGo);
      }
    });

    return () => unsubscribe();
  }, [isEditingPricing]);

  // Check if admin
  useEffect(() => {
    if (!isAdmin && !loading) {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
        variant: "destructive",
      });
    }
  }, [isAdmin, loading, toast]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const handleEditPackage = (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (pkg) {
      setEditingPackage(packageId);
      setEditFormData({ ...pkg });
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPackage || !editFormData) return;

    setIsSaving(true);
    try {
      await updateExistingPackage(editingPackage, editFormData);
      setEditingPackage(null);
      setEditFormData({});

      toast({
        title: "Package updated",
        description: "The package has been updated successfully in Firebase.",
      });
    } catch (error) {
      console.error('Update package error:', error);
      toast({
        title: "Update failed",
        description: "Failed to update package. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingPackage(null);
    setEditFormData({});
  };

  const handleToggleActive = async (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;

    try {
      await toggleStatus(packageId, !pkg.active);
      toast({
        title: "Package updated",
        description: `Package ${pkg.active ? 'deactivated' : 'activated'} successfully.`,
      });
    } catch (error) {
      console.error('Toggle status error:', error);
      toast({
        title: "Update failed",
        description: "Failed to update package status.",
        variant: "destructive",
      });
    }
  };

  const handleTogglePopular = async (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;

    try {
      await togglePopular(packageId, pkg.type, !pkg.popular);
      toast({
        title: "Package updated",
        description: `Package ${pkg.popular ? 'unmarked' : 'marked'} as popular.`,
      });
    } catch (error) {
      console.error('Toggle popular error:', error);
      toast({
        title: "Update failed",
        description: "Failed to update package popularity.",
        variant: "destructive",
      });
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;

    if (confirm(`Are you sure you want to delete "${pkg.name}"? This action cannot be undone.`)) {
      try {
        await deleteExistingPackage(packageId);
        toast({
          title: "Package deleted",
          description: "The package has been permanently deleted from Firebase.",
        });
      } catch (error) {
        console.error('Delete package error:', error);
        toast({
          title: "Delete failed",
          description: "Failed to delete package.",
          variant: "destructive",
        });
      }
    }
  };

  const handleInitializeDefaults = async () => {
    if (confirm('This will initialize default packages in Firebase. Continue only if the packages collection is empty. Continue?')) {
      try {
        await initializeDefaults();
        toast({
          title: "Packages initialized",
          description: "Default packages have been added to Firebase.",
        });
      } catch (error) {
        console.error('Initialize defaults error:', error);
        toast({
          title: "Initialization failed",
          description: "Failed to initialize default packages.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshPackages();
      toast({
        title: "Packages refreshed",
        description: "Package data has been refreshed from Firebase.",
      });
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh packages.",
        variant: "destructive",
      });
    }
  };

  const handleEditPricing = () => {
    setIsEditingPricing(true);
    if (pricingSettings) {
      setPricingFormData(pricingSettings.payAsYouGo);
    }
  };

  const handleCancelPricingEdit = () => {
    setIsEditingPricing(false);
    if (pricingSettings) {
      setPricingFormData(pricingSettings.payAsYouGo);
    }
  };

  const handleSavePricing = async () => {
    setIsSavingPricing(true);
    try {
      // Update pricing settings
      await updatePricingSettings({
        payAsYouGo: pricingFormData
      });

      // Update all packages' standardRate to match the new pay-as-you-go rates
      const updatePromises = packages.map(async (pkg) => {
        let newStandardRate = 0;
        if (pkg.type === 'ai') newStandardRate = pricingFormData.ai;
        else if (pkg.type === 'hybrid') newStandardRate = pricingFormData.hybrid;
        else if (pkg.type === 'human') newStandardRate = pricingFormData.human;

        // Recalculate savings based on new standard rate
        const standardCost = newStandardRate * pkg.minutes;
        const savingsAmount = standardCost - pkg.price;
        const savingsPercentage = (savingsAmount / standardCost) * 100;

        await updateExistingPackage(pkg.id, {
          standardRate: newStandardRate,
          savingsPercentage: Math.max(0, savingsPercentage),
          savingsAmount: Math.max(0, savingsAmount)
        });
      });

      await Promise.all(updatePromises);

      toast({
        title: "Pricing updated",
        description: "Pay-as-you-go rates and all package savings have been updated successfully.",
      });

      setIsEditingPricing(false);

      // Refresh packages to show updated values
      await refreshPackages();
    } catch (error) {
      console.error('Error updating pricing:', error);
      toast({
        title: "Update failed",
        description: "Failed to update pricing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPricing(false);
    }
  };

  const filteredPackages = getPackagesByType(selectedTab, false); // Get all packages (not just active)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="p-8">
              <h2 className="text-xl font-semibold text-red-600 mb-2">Access Denied</h2>
              <p className="text-gray-600">You need admin privileges to access this page.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#003366] mb-2">
                Package Manager
              </h1>
              <p className="text-gray-600">
                Manage transcription packages and pricing in Firebase.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="text-[#003366] border-[#003366] hover:bg-[#003366] hover:text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {packages.length === 0 && (
                <Button
                  onClick={handleInitializeDefaults}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Initialize Defaults
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="mb-8 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Firebase Connected:</strong> All changes are saved to Firebase in real-time and immediately reflected on pricing and billing pages.
            Each transcription type (AI, Hybrid, Human) has three tiers. Only one package per type can be marked as "Popular" at a time.
          </AlertDescription>
        </Alert>

        {/* Pay-as-you-go Pricing Editor */}
        {pricingSettings && (
          <Card className="mb-8 border-0 shadow-sm">
            <CardHeader className="bg-gradient-to-r from-[#003366] to-[#004488] text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  <CardTitle>Pay-As-You-Go Standard Rates</CardTitle>
                </div>
                {!isEditingPricing ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditPricing}
                    className="bg-white text-[#003366] hover:bg-gray-100"
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit Rates
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelPricingEdit}
                      disabled={isSavingPricing}
                      className="bg-white text-[#003366] hover:bg-gray-100"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePricing}
                      disabled={isSavingPricing}
                      className="bg-[#b29dd9] hover:bg-[#9d87c7] text-white"
                    >
                      {isSavingPricing ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* AI Rate */}
                <div className="flex items-center gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <Zap className="h-8 w-8 text-yellow-600 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-gray-700">AI Transcription</Label>
                    {isEditingPricing ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricingFormData.ai}
                        onChange={(e) => setPricingFormData({ ...pricingFormData, ai: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1 text-2xl font-bold text-[#003366]">
                        CA${pricingSettings.payAsYouGo.ai.toFixed(2)}/min
                      </div>
                    )}
                  </div>
                </div>

                {/* Hybrid Rate */}
                <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-gray-700">Hybrid (AI + Human)</Label>
                    {isEditingPricing ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricingFormData.hybrid}
                        onChange={(e) => setPricingFormData({ ...pricingFormData, hybrid: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1 text-2xl font-bold text-[#003366]">
                        CA${pricingSettings.payAsYouGo.hybrid.toFixed(2)}/min
                      </div>
                    )}
                  </div>
                </div>

                {/* Human Rate */}
                <div className="flex items-center gap-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <Check className="h-8 w-8 text-purple-600 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-gray-700">100% Human</Label>
                    {isEditingPricing ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pricingFormData.human}
                        onChange={(e) => setPricingFormData({ ...pricingFormData, human: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1 text-2xl font-bold text-[#003366]">
                        CA${pricingSettings.payAsYouGo.human.toFixed(2)}/min
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                <Info className="h-3 w-3 inline mr-1" />
                These rates are used as the "Standard Price" reference for package savings and pay-as-you-go estimates.
              </p>
            </CardContent>
          </Card>
        )}

        {packages.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Packages Found</h3>
              <p className="text-gray-500 mb-6">Click "Initialize Defaults" to add the standard packages to Firebase.</p>
              <Button
                onClick={handleInitializeDefaults}
                className="bg-[#003366] hover:bg-[#002244] text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Initialize Default Packages
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Package Tabs */}
            <Tabs value={selectedTab} onValueChange={(value) => setSelectedTab(value as 'ai' | 'hybrid' | 'human')} className="w-full">
              <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 mb-8">
                <TabsTrigger value="ai" className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4" />
                  AI Transcription
                </TabsTrigger>
                <TabsTrigger value="hybrid" className="flex items-center justify-center gap-2">
                  <Users className="h-4 w-4" />
                  Hybrid (AI + Human)
                </TabsTrigger>
                <TabsTrigger value="human" className="flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" />
                  100% Human
                </TabsTrigger>
              </TabsList>

              {/* Package Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {filteredPackages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`relative border-0 shadow-sm hover:shadow-md transition-shadow ${
                      pkg.popular ? 'ring-2 ring-[#b29dd9]' : ''
                    } ${!pkg.active ? 'opacity-60' : ''}`}
                  >
                    {pkg.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div className="bg-[#b29dd9] text-white px-4 py-1 rounded-full text-sm font-medium flex items-center">
                          <Star className="h-4 w-4 mr-1" />
                          Most Popular
                        </div>
                      </div>
                    )}

                    <CardHeader className="pb-4">
                      {/* Editing Mode */}
                      {editingPackage === pkg.id ? (
                        <>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor={`name-${pkg.id}`}>Package Name</Label>
                              <Input
                                id={`name-${pkg.id}`}
                                value={editFormData.name}
                                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label htmlFor={`minutes-${pkg.id}`}>Minutes</Label>
                                <Input
                                  id={`minutes-${pkg.id}`}
                                  type="number"
                                  value={editFormData.minutes}
                                  onChange={(e) => setEditFormData({ ...editFormData, minutes: parseInt(e.target.value) || 0 })}
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`price-${pkg.id}`}>Price (CAD)</Label>
                                <Input
                                  id={`price-${pkg.id}`}
                                  type="number"
                                  step="0.01"
                                  value={editFormData.price}
                                  onChange={(e) => setEditFormData({ ...editFormData, price: parseFloat(e.target.value) || 0 })}
                                  className="mt-1"
                                />
                              </div>
                            </div>
                            <div>
                              <Label htmlFor={`desc-${pkg.id}`}>Description</Label>
                              <Textarea
                                id={`desc-${pkg.id}`}
                                value={editFormData.description}
                                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                className="mt-1"
                                rows={2}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`bestfor-${pkg.id}`}>Best For</Label>
                              <Input
                                id={`bestfor-${pkg.id}`}
                                value={editFormData.bestFor}
                                onChange={(e) => setEditFormData({ ...editFormData, bestFor: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-xl font-bold text-[#003366]">
                                {pkg.name}
                              </CardTitle>
                              <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                            </div>
                            <div className="flex items-center space-x-1 ml-2">
                              {editingPackage === null && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleTogglePopular(pkg.id)}
                                    className={pkg.popular ? 'text-yellow-600' : 'text-gray-400'}
                                  >
                                    <Star className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditPackage(pkg.id)}
                                    className="text-gray-600 hover:text-[#003366]"
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeletePackage(pkg.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Pricing Information */}
                          <div className="mt-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-3xl font-bold text-[#003366]">
                                CA${pkg.price}
                              </span>
                              <span className="text-sm text-gray-600">
                                {pkg.minutes} minutes
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Rate:</span>
                              <span className="font-medium text-[#003366]">
                                CA${pkg.perMinuteRate.toFixed(2)}/min
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Standard:</span>
                              <span className="text-gray-600 line-through">
                                CA${pkg.standardRate.toFixed(2)}/min
                              </span>
                            </div>
                            {pkg.savingsPercentage > 0 && (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-2">
                                <div className="text-green-700 font-semibold text-sm">
                                  Save {pkg.savingsPercentage.toFixed(0)}%
                                </div>
                                <div className="text-green-600 text-xs">
                                  CA${pkg.savingsAmount.toFixed(0)} off standard
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardHeader>

                    <CardContent className="pt-0">
                      {editingPackage === pkg.id ? (
                        <>
                          {/* Edit Actions */}
                          <div className="flex justify-end space-x-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCancelEdit}
                              disabled={isSaving}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={handleSaveEdit}
                              disabled={isSaving}
                              className="bg-[#003366] hover:bg-[#002244] text-white"
                            >
                              {isSaving ? (
                                <>
                                  <LoadingSpinner size="sm" className="mr-2" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-1" />
                                  Save
                                </>
                              )}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Package Details */}
                          <div className="space-y-3 mb-4">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 text-gray-600">
                                <FileAudio className="h-3 w-3" />
                                Estimate:
                              </span>
                              <span className="font-medium">{pkg.estimatedFiles}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 text-gray-600">
                                <Calendar className="h-3 w-3" />
                                Valid for:
                              </span>
                              <span className="font-medium">{pkg.validity}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 text-gray-600">
                                <TrendingDown className="h-3 w-3" />
                                Vs. standard:
                              </span>
                              <span className="font-medium text-green-600">
                                -{((pkg.standardRate - pkg.perMinuteRate) / pkg.standardRate * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-600">Best for:</span>
                              <span className="font-medium bg-gray-100 px-2 py-1 rounded">
                                {pkg.bestFor}
                              </span>
                            </div>
                          </div>

                          {/* Features */}
                          <div className="border-t pt-4">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Features:</p>
                            <ul className="space-y-1">
                              {pkg.features.slice(0, 5).map((feature, idx) => (
                                <li key={idx} className="flex items-start text-xs text-gray-600">
                                  <Check className={`h-3 w-3 ${feature.includes('FREE') ? 'text-green-500' : 'text-gray-400'} mr-1 flex-shrink-0 mt-0.5`} />
                                  <span className={feature.includes('FREE') ? 'font-medium text-green-700' : ''}>
                                    {feature}
                                  </span>
                                </li>
                              ))}
                              {pkg.features.length > 5 && (
                                <li className="text-xs text-gray-500 italic ml-4">
                                  +{pkg.features.length - 5} more features...
                                </li>
                              )}
                            </ul>
                          </div>

                          {/* Status Toggle */}
                          <div className="flex items-center justify-between mt-4 pt-4 border-t">
                            <div className="flex items-center space-x-2">
                              <Switch
                                checked={pkg.active}
                                onCheckedChange={() => handleToggleActive(pkg.id)}
                              />
                              <Label className="text-sm">
                                {pkg.active ? 'Active' : 'Inactive'}
                              </Label>
                            </div>

                            <span className={`text-xs px-2 py-1 rounded-full ${
                              pkg.active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {pkg.active ? 'Live' : 'Draft'}
                            </span>
                          </div>

                          {/* Add-ons indicator */}
                          {pkg.includesAddons && (
                            <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-xs text-blue-800 font-medium">
                                ✓ FREE Rush & Multi-speaker Add-ons Included
                              </p>
                            </div>
                          )}

                          {/* Firebase ID */}
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-[10px] text-gray-400">
                              Firebase ID: {pkg.id}
                            </p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Tabs>

            {/* Summary Statistics */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total Active Packages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#003366]">
                    {packages.filter(p => p.active).length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Live in Firebase
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Average Discount
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {packages.length > 0 ?
                      (packages.reduce((acc, pkg) => acc + pkg.savingsPercentage, 0) / packages.length).toFixed(0) : 0}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Compared to standard rates
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Popular Packages
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#b29dd9]">
                    {packages.filter(p => p.popular).length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Highlighted for customers
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

export default function AdminPackages() {
  return <PackageManager />;
}

"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Package, Wallet, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function DebugPackagesPage() {
  const { user, userData } = useAuth();
  const { walletBalance, packages, freeTrialMinutes, freeTrialActive, refreshWallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refreshWallet();
    } catch (error) {
      console.error('Error refreshing wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckServer = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/check-user-packages');
      const data = await response.json();
      setDebugData(data);
    } catch (error) {
      console.error('Error checking server data:', error);
      setDebugData({ error: 'Failed to fetch server data' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card>
          <CardContent className="p-6">
            <p>Please log in to view your packages</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#003366]">Package Debug Tool</h1>
          <p className="text-gray-600 mt-2">Check your purchased packages and wallet status</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Wallet Data
          </Button>

          <Button
            onClick={handleCheckServer}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Package className="h-4 w-4" />
            Check Server Data
          </Button>
        </div>

        {/* Current State (Client-side) */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Current Wallet State (Client-side)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Wallet Balance */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Wallet Balance</p>
                  <p className="text-2xl font-bold text-[#003366]">CA${walletBalance.toFixed(2)}</p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Free Trial</p>
                  <p className="text-2xl font-bold text-green-600">
                    {freeTrialMinutes} min {freeTrialActive ? '✓' : '✗'}
                  </p>
                </div>
              </div>

              {/* Packages */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Purchased Packages ({packages.length})</h3>
                {packages.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800">⚠️ No packages found in client-side state</p>
                    <p className="text-sm text-yellow-600 mt-1">
                      If you just purchased a package, try clicking "Refresh Wallet Data" above
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {packages.map((pkg) => (
                      <div key={pkg.id} className="bg-white border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-[#003366]">{pkg.name}</h4>
                            <p className="text-sm text-gray-600">Type: {pkg.type}</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            pkg.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {pkg.active ? 'Active' : 'Inactive'}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mt-4">
                          <div>
                            <p className="text-xs text-gray-500">Total</p>
                            <p className="font-semibold">{pkg.minutesTotal} min</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Used</p>
                            <p className="font-semibold text-red-600">{pkg.minutesUsed} min</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Remaining</p>
                            <p className="font-semibold text-green-600">{pkg.minutesRemaining} min</p>
                          </div>
                        </div>

                        <div className="flex justify-between mt-3 text-xs text-gray-500">
                          <span>Purchased: {new Date(pkg.purchasedAt).toLocaleDateString()}</span>
                          <span>Expires: {new Date(pkg.expiresAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Server Data */}
        {debugData && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Server Data (Direct from Firestore)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {debugData.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">❌ Error: {debugData.error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-gray-600">Wallet Balance</p>
                        <p className="text-lg font-semibold">CA${debugData.walletBalance?.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Total Packages</p>
                        <p className="text-lg font-semibold">{debugData.debug?.packagesCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Active Packages</p>
                        <p className="text-lg font-semibold text-green-600">{debugData.debug?.activePackagesCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Free Trial</p>
                        <p className="text-lg font-semibold">{debugData.freeTrialMinutes || 0} min</p>
                      </div>
                    </div>
                  </div>

                  {/* Debug Info */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Debug Information</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        {debugData.debug?.hasPackagesField ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span>packages field exists</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {debugData.debug?.packagesIsArray ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span>packages is an array</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {debugData.debug?.hasWalletField ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span>walletBalance field exists</span>
                      </div>
                    </div>
                  </div>

                  {/* Raw Packages Data */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Raw Server Packages</h4>
                    <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
                      <pre className="text-xs">{JSON.stringify(debugData.packages, null, 2)}</pre>
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">Recent Transactions</h4>
                    <div className="space-y-2">
                      {debugData.recentTransactions?.length === 0 ? (
                        <p className="text-gray-500 text-sm">No transactions found</p>
                      ) : (
                        debugData.recentTransactions?.map((tx: any) => (
                          <div key={tx.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                            <div>
                              <p className="text-sm font-medium">{tx.description}</p>
                              <p className="text-xs text-gray-500">{tx.createdAt?.toDate?.()?.toLocaleString() || new Date(tx.createdAt).toLocaleString()}</p>
                            </div>
                            <div className={`font-semibold ${
                              tx.type === 'package_purchase' || tx.type === 'wallet_topup'
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {tx.type === 'package_purchase'
                                ? `+${tx.packageMinutes || tx.amount} min`
                                : tx.type === 'wallet_topup'
                                ? `+CA$${tx.amount}`
                                : `-CA$${Math.abs(tx.amount)}`}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-2">How to Use This Tool:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Click "Refresh Wallet Data" to reload your packages from the database</li>
              <li>Click "Check Server Data" to see exactly what's stored in Firestore</li>
              <li>Compare the two sections to identify any sync issues</li>
              <li>If packages show in Server Data but not Client State, try logging out and back in</li>
              <li>If packages don't show in Server Data, the webhook may not have processed</li>
            </ol>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

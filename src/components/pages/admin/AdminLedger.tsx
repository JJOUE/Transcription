"use client";

import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, TrendingUp, TrendingDown, RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useCredits } from '@/contexts/CreditContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface AdminTransaction {
  id: string;
  user: string;
  type: 'wallet_topup' | 'package_purchase' | 'transcription' | 'refund' | 'adjustment' | 'purchase' | 'consumption';
  amount: number;
  description: string;
  date: Date;
  jobId: string | null;
  revenue: number;
}

export function AdminLedger() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [adminTransactions, setAdminTransactions] = useState<AdminTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getAllTransactions } = useCredits();
  const { toast } = useToast();
  const { userData, loading: authLoading } = useAuth();

  // Load real transactions from Firebase
  useEffect(() => {
    const loadAdminTransactions = async () => {
      // Wait for auth to be ready and ensure user is admin
      if (authLoading || !userData) {
        return;
      }

      if (userData.role !== 'admin') {
        toast({
          title: "Access denied",
          description: "You must be an admin to view this page.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const transactions = await getAllTransactions();
        
        // Transform Firebase transactions to match AdminTransaction interface
        const transformedTransactions: AdminTransaction[] = transactions.map(transaction => ({
          id: transaction.id,
          user: transaction.userEmail || 'Unknown User',
          type: transaction.type,
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.createdAt instanceof Date 
            ? transaction.createdAt 
            : transaction.createdAt?.toDate?.()
            ? transaction.createdAt.toDate()
            : new Date(transaction.createdAt),
          jobId: transaction.jobId || null,
          revenue: transaction.revenue || 0
        }));
        
        setAdminTransactions(transformedTransactions);
      } catch (error) {
        console.error('Error loading admin transactions:', error);
        toast({
          title: "Error loading transactions",
          description: "Could not fetch transaction data from database.",
          variant: "destructive",
        });
        
        // Fallback to empty array on error
        setAdminTransactions([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAdminTransactions();
  }, [getAllTransactions, toast, authLoading, userData]);

  // Refresh function for manual reload
  const handleRefreshTransactions = async () => {
    // Check auth status before refreshing
    if (!userData || userData.role !== 'admin') {
      toast({
        title: "Access denied",
        description: "You must be an admin to perform this action.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const transactions = await getAllTransactions();
      
      const transformedTransactions: AdminTransaction[] = transactions.map(transaction => ({
        id: transaction.id,
        user: transaction.userEmail || 'Unknown User',
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        date: transaction.createdAt instanceof Date ? transaction.createdAt : new Date(transaction.createdAt),
        jobId: transaction.jobId || null,
        revenue: transaction.revenue || 0
      }));
      
      setAdminTransactions(transformedTransactions);
      
      toast({
        title: "Transactions refreshed",
        description: "Successfully loaded latest transaction data.",
      });
    } catch (error) {
      console.error('Error refreshing transactions:', error);
      toast({
        title: "Error refreshing transactions",
        description: "Could not fetch latest transaction data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Export transactions to CSV
  const handleExportReport = () => {
    try {
      // Create CSV content
      const headers = ['Date', 'Time', 'User', 'Type', 'Description', 'Credits', 'Revenue', 'Job ID'];
      const csvContent = [
        headers.join(','),
        ...filteredTransactions.map(transaction => [
          transaction.date.toISOString().slice(0, 10),
          transaction.date.toISOString().slice(11, 19),
          `"${transaction.user}"`,
          transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
          `"${transaction.description}"`,
          transaction.amount,
          transaction.revenue || 0,
          transaction.jobId || ''
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `credit-ledger-${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Report exported",
        description: "Transaction report has been downloaded as CSV file.",
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      toast({
        title: "Export failed",
        description: "Could not export transaction report.",
        variant: "destructive",
      });
    }
  };

  // Helper function to check if transaction is within date range
  const isWithinDateRange = (transactionDate: Date) => {
    const today = new Date();
    const transactionDateOnly = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate());
    
    switch (dateRange) {
      case 'today':
        const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return transactionDateOnly.getTime() === todayOnly.getTime();
      
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return transactionDate >= weekAgo;
      
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(today.getMonth() - 1);
        return transactionDate >= monthAgo;
      
      case '3months':
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setMonth(today.getMonth() - 3);
        return transactionDate >= threeMonthsAgo;
      
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setFullYear(today.getFullYear() - 1);
        return transactionDate >= yearAgo;
      
      case 'custom':
        if (!customStartDate && !customEndDate) return true;
        
        const startDate = customStartDate ? new Date(customStartDate) : new Date(0);
        const endDate = customEndDate ? new Date(customEndDate) : new Date();
        
        // Set end date to end of day for inclusive filtering
        if (customEndDate) {
          endDate.setHours(23, 59, 59, 999);
        }
        
        return transactionDate >= startDate && transactionDate <= endDate;
      
      case 'all':
      default:
        return true;
    }
  };

  const filteredTransactions = adminTransactions.filter(transaction => {
    const matchesSearch = transaction.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesDate = isWithinDateRange(transaction.date);
    return matchesSearch && matchesType && matchesDate;
  });

  const stats = {
    totalRevenue: filteredTransactions.filter(t => t.type === 'wallet_topup' || t.type === 'package_purchase' || t.type === 'purchase').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    totalFundsAdded: filteredTransactions.filter(t => t.type === 'wallet_topup' || t.type === 'purchase').reduce((sum, t) => sum + Math.abs(t.amount), 0),
    totalFundsUsed: Math.abs(filteredTransactions.filter(t => t.type === 'transcription' || t.type === 'consumption').reduce((sum, t) => sum + t.amount, 0)),
    totalRefunds: filteredTransactions.filter(t => t.type === 'refund').reduce((sum, t) => sum + Math.abs(t.amount), 0)
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center py-32">
            <LoadingSpinner size="lg" className="mb-4" />
            <p className="text-gray-500 ml-4">Authenticating...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Show access denied if not admin
  if (!userData || userData.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-12 text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600">You must be an administrator to view the credit ledger.</p>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#003366] mb-2">
                Credit Ledger
              </h1>
              <p className="text-gray-600">
                Track all credit transactions and revenue across the platform.
              </p>
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                onClick={handleRefreshTransactions}
                disabled={isLoading}
                className="border-[#003366] text-[#003366]"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExportReport}
                className="border-[#003366] text-[#003366]"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {(dateRange !== 'all' || filterType !== 'all' || searchTerm) && (
            <div className="md:col-span-2 lg:col-span-4 mb-2">
              <p className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md border border-blue-200">
                <Filter className="inline h-4 w-4 mr-2" />
                Showing filtered results
                {dateRange !== 'all' && ` • ${dateRange === 'custom' ? 'Custom date range' : dateRange}`}
                {filterType !== 'all' && ` • ${filterType} only`}
                {searchTerm && ` • Search: "${searchTerm}"`}
              </p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">CA${stats.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Funds Added</p>
                  <p className="text-2xl font-bold text-[#003366]">CA${stats.totalFundsAdded.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#b29dd9] rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Funds Used</p>
                  <p className="text-2xl font-bold text-[#003366]">CA${stats.totalFundsUsed.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#003366] rounded-lg flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Funds Refunded</p>
                  <p className="text-2xl font-bold text-[#003366]">CA${stats.totalRefunds.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              {/* First Row: Search, Type Filter, and Date Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by user or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-40">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="wallet_topup">Wallet Topups</SelectItem>
                    <SelectItem value="package_purchase">Package Purchases</SelectItem>
                    <SelectItem value="transcription">Transcriptions</SelectItem>
                    <SelectItem value="refund">Refunds</SelectItem>
                    <SelectItem value="adjustment">Adjustments</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full sm:w-44">
                    <Calendar className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Second Row: Custom Date Range (only shows when custom is selected) */}
              {dateRange === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex gap-2 flex-1">
                    <div className="flex-1">
                      <Input
                        type="date"
                        placeholder="Start date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="date"
                        placeholder="End date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDateRange('all');
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="text-gray-500 hover:text-gray-700 w-auto"
                  >
                    Clear Custom Range
                  </Button>
                </div>
              )}
              
              {/* Clear Filters Row (only shows when filters are active) */}
              {(dateRange !== 'all' || filterType !== 'all' || searchTerm) && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-sm text-gray-600">
                    Active filters: 
                    {searchTerm && ` Search`}
                    {filterType !== 'all' && ` • Type: ${filterType}`}
                    {dateRange !== 'all' && ` • Date: ${dateRange === 'custom' ? 'Custom range' : dateRange}`}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterType('all');
                      setDateRange('all');
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#003366]">
              Transactions ({filteredTransactions.length})
              {isLoading && <LoadingSpinner size="sm" className="ml-2 inline" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Credits</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Revenue</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Job ID</th>
                  </tr>
                </thead>
                <tbody>
                  {(isLoading || authLoading) ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <LoadingSpinner size="md" className="mx-auto mb-2" />
                        <p className="text-gray-500">
                          {authLoading ? "Authenticating..." : "Loading transactions..."}
                        </p>
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <p className="text-gray-500">
                          {adminTransactions.length === 0 
                            ? "No transactions found in the database." 
                            : "No transactions match your search criteria."
                          }
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-600">
                          {transaction.date.toISOString().slice(0, 10)}
                        </span>
                        <br />
                        <span className="text-xs text-gray-500">
                          {transaction.date.toISOString().slice(11, 19)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-[#003366] font-medium">
                          {transaction.user}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          transaction.type === 'wallet_topup' ? 'bg-green-100 text-green-800' :
                          transaction.type === 'package_purchase' ? 'bg-purple-100 text-purple-800' :
                          transaction.type === 'transcription' ? 'bg-blue-100 text-blue-800' :
                          transaction.type === 'refund' ? 'bg-yellow-100 text-yellow-800' :
                          transaction.type === 'adjustment' ? 'bg-orange-100 text-orange-800' :
                          transaction.type === 'purchase' ? 'bg-green-100 text-green-800' : // legacy
                          transaction.type === 'consumption' ? 'bg-blue-100 text-blue-800' : // legacy
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {transaction.type === 'wallet_topup' ? 'Wallet Topup' :
                           transaction.type === 'package_purchase' ? 'Package' :
                           transaction.type === 'transcription' ? 'Transcription' :
                           transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-gray-700">
                          {transaction.description}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`font-medium ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {transaction.revenue > 0 ? (
                          <span className="text-green-600 font-medium">
                            ${transaction.revenue}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        {transaction.jobId ? (
                          <span className="text-xs text-gray-500 font-mono">
                            {transaction.jobId}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
// Default export for Next.js pages compatibility
export default AdminLedger;

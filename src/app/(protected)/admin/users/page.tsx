"use client";

import React, { useEffect, useState } from 'react';
import { Search, Filter, MoreHorizontal, Mail, Ban, Coins, XCircle, Star, Package, Clock, TrendingUp, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { getAllUsers } from '@/lib/firebase/firestore';
import { UserData } from '@/lib/firebase/auth';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function UserManagementPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterFreeTrial, setFilterFreeTrial] = useState('all');
  const [users, setUsers] = useState<UserData[]>([]);
  const [userPackages, setUserPackages] = useState<Record<string, { total: number; ai: number; hybrid: number; human: number }>>({});
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [updating, setUpdating] = useState(false);

  // Free trial management modal
  const [freeTrialModalUser, setFreeTrialModalUser] = useState<UserData | null>(null);
  const [freeTrialMinutes, setFreeTrialMinutes] = useState('');
  const [freeTrialReason, setFreeTrialReason] = useState('');

  // Delete user modal
  const [deleteModalUser, setDeleteModalUser] = useState<UserData | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Check if user is admin
    if (!authLoading && userData?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    const loadUsers = async () => {
      if (userData?.role !== 'admin') return;

      try {
        setLoading(true);
        const allUsers = await getAllUsers();
        setUsers(allUsers);
        setLoading(false);

        // Load package counts in parallel (non-blocking)
        const packagePromises = allUsers.map(async (u) => {
          const userId = u.id || u.uid;
          try {
            const packagesRef = collection(db, 'users', userId, 'packages');
            const activePackagesQuery = query(packagesRef, where('active', '==', true));
            const snapshot = await getDocs(activePackagesQuery);

            const counts = { total: 0, ai: 0, hybrid: 0, human: 0 };
            snapshot.forEach(doc => {
              const pkg = doc.data();
              counts.total++;
              if (pkg.type === 'ai') counts.ai++;
              else if (pkg.type === 'hybrid') counts.hybrid++;
              else if (pkg.type === 'human') counts.human++;
            });

            return { userId, counts };
          } catch (pkgError) {
            console.warn(`Failed to load packages for user ${userId}:`, pkgError);
            return { userId, counts: { total: 0, ai: 0, hybrid: 0, human: 0 } };
          }
        });

        const results = await Promise.all(packagePromises);
        const packagesData: Record<string, { total: number; ai: number; hybrid: number; human: number }> = {};
        for (const { userId, counts } of results) {
          packagesData[userId] = counts;
        }
        setUserPackages(packagesData);
      } catch (error) {
        console.error('Error loading users:', error);
        toast({
          title: "Error loading users",
          description: "Please try again or contact support.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadUsers();
    }
  }, [userData, authLoading, router, toast]);

  const handleUpdateWalletBalance = async () => {
    if (!selectedUser) return;
    const userId = selectedUser.id || selectedUser.uid;

    const amount = parseFloat(walletAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid wallet amount.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/admin/users/${userId}/wallet`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          walletBalance: amount,
          reason: adjustmentReason.trim() || `Admin updated wallet balance to CA$${amount.toFixed(2)}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update wallet balance');
      }

      const result = await response.json();

      // Update the user in the local state
      setUsers(prevUsers =>
        prevUsers.map(u => {
          const uId = u.id || u.uid;
          return uId === userId ? { ...u, walletBalance: amount } : u;
        })
      );

      toast({
        title: "Wallet balance updated",
        description: result.message,
      });

      // Close modal and reset form
      setSelectedUser(null);
      setWalletAmount('');
      setAdjustmentReason('');
    } catch (error) {
      console.error('Error updating wallet balance:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update wallet balance',
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateFreeTrial = async () => {
    if (!freeTrialModalUser) return;
    const userId = freeTrialModalUser.id || freeTrialModalUser.uid;

    const minutes = parseFloat(freeTrialMinutes);
    if (isNaN(minutes) || minutes < 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid number of minutes.",
        variant: "destructive",
      });
      return;
    }

    setUpdating(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/admin/users/${userId}/free-trial`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          freeTrialMinutes: minutes,
          reason: freeTrialReason.trim() || `Admin updated free trial minutes to ${minutes}`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update free trial');
      }

      const result = await response.json();

      // Update the user in the local state
      setUsers(prevUsers =>
        prevUsers.map(u => {
          const uId = u.id || u.uid;
          return uId === userId ? {
            ...u,
            freeTrialMinutes: minutes,
            freeTrialActive: minutes > 0,
          } : u;
        })
      );

      toast({
        title: "Free trial updated",
        description: result.message,
      });

      // Close modal and reset form
      setFreeTrialModalUser(null);
      setFreeTrialMinutes('');
      setFreeTrialReason('');
    } catch (error) {
      console.error('Error updating free trial:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update free trial',
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteModalUser || deleteConfirmText !== 'DELETE') return;
    const userId = deleteModalUser.id || deleteModalUser.uid;

    setDeleting(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch(`/api/admin/users/${userId}/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      // Remove user from local state
      setUsers(prevUsers => prevUsers.filter(u => (u.id || u.uid) !== userId));

      toast({
        title: "User deleted",
        description: `${deleteModalUser.email} has been permanently deleted.`,
      });

      setDeleteModalUser(null);
      setDeleteConfirmText('');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to delete user',
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesFreeTrial = filterFreeTrial === 'all' ||
      (filterFreeTrial === 'active' && user.freeTrialActive) ||
      (filterFreeTrial === 'used' && !user.freeTrialActive && (user.freeTrialMinutesUsed || 0) > 0) ||
      (filterFreeTrial === 'none' && !user.freeTrialActive && !(user.freeTrialMinutesUsed || 0));
    return matchesSearch && matchesRole && matchesFreeTrial;
  });
  const hasActiveFilters = searchTerm.trim() !== '' || filterRole !== 'all' || filterFreeTrial !== 'all';


  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (userData?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#003366] mb-2">
              User Management
            </h1>
            <p className="text-gray-600">
              Manage user accounts, credits, and permissions.
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search users by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterFreeTrial} onValueChange={setFilterFreeTrial}>
                <SelectTrigger className="w-full sm:w-52">
                  <Star className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by free trial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="active">Active Free Trial</SelectItem>
                  <SelectItem value="used">Used Free Trial</SelectItem>
                  <SelectItem value="none">No Free Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#003366]">
              Users ({hasActiveFilters ? `${filteredUsers.length} of ${users.length}` : users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Free Trial</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Packages</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Wallet</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Total Spent</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Jobs</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden xl:table-cell">Joined</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-500">
                        No users found
                      </td>
                    </tr>
                  )}

                  {filteredUsers.map((user) => {
                    const userId = user.id || user.uid;
                    const freeTrialRemaining = user.freeTrialMinutes || 0;
                    const freeTrialUsed = user.freeTrialMinutesUsed || 0;
                    const freeTrialTotal = user.freeTrialMinutesTotal || 60;
                    const freeTrialPercent = (freeTrialUsed / freeTrialTotal) * 100;
                    const packages = userPackages[userId] || { total: 0, ai: 0, hybrid: 0, human: 0 };

                    return (
                      <tr key={userId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="min-w-[150px]">
                            <p className="font-medium text-[#003366] truncate">{user.name || 'Unnamed User'}</p>
                            <p className="text-sm text-gray-600 truncate max-w-[200px]" title={user.email}>{user.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            user.role === 'admin'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {user.freeTrialActive ? (
                            <div className="min-w-[110px]">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                                ✓ Active
                              </span>
                              <div className="flex items-center gap-1 mt-1">
                                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 transition-all"
                                    style={{ width: `${Math.min(100, freeTrialPercent)}%` }}
                                  />
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {freeTrialRemaining}/{freeTrialTotal} min
                              </div>
                            </div>
                          ) : freeTrialUsed > 0 ? (
                            <div className="min-w-[110px]">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 whitespace-nowrap">
                                Used
                              </span>
                              <div className="text-xs text-gray-500 mt-1">
                                {freeTrialUsed}/{freeTrialTotal} min
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4 hidden md:table-cell">
                          {packages.total > 0 ? (
                            <div className="min-w-[100px]">
                              <div className="flex items-center gap-1 mb-1">
                                <Package className="h-3 w-3 text-[#003366]" />
                                <span className="font-medium text-[#003366]">{packages.total}</span>
                              </div>
                              <div className="flex gap-1 text-xs">
                                {packages.ai > 0 && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">AI: {packages.ai}</span>
                                )}
                                {packages.hybrid > 0 && (
                                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">H: {packages.hybrid}</span>
                                )}
                                {packages.human > 0 && (
                                  <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded">Hu: {packages.human}</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1 text-[#003366] font-medium">
                            <DollarSign className="h-3 w-3" />
                            <span>{(user.walletBalance || 0).toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 hidden lg:table-cell">
                          <div className="flex items-center gap-1 text-gray-700 font-medium">
                            <TrendingUp className="h-3 w-3" />
                            <span>CA${(user.totalSpent || 0).toFixed(2)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 hidden lg:table-cell">
                          <span className="text-[#003366] font-medium">{user.totalJobs || 0}</span>
                        </td>
                        <td className="py-4 px-4 hidden xl:table-cell">
                          <span className="text-gray-600 text-sm whitespace-nowrap">
                            {user.createdAt?.toDate?.()?.toLocaleDateString() || '—'}
                          </span>
                        </td>
                      <td className="py-4 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedUser(user);
                              const currentBalance = user.walletBalance || 0;
                              setWalletAmount(currentBalance.toFixed(2));
                              setAdjustmentReason('');
                            }}>
                              <DollarSign className="mr-2 h-4 w-4" />
                              Edit Wallet Balance
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setFreeTrialModalUser(user);
                              const currentFreeTrialMinutes = user.freeTrialMinutes || 0;
                              setFreeTrialMinutes(currentFreeTrialMinutes.toString());
                              setFreeTrialReason('');
                            }}>
                              <Star className="mr-2 h-4 w-4" />
                              Manage Free Trial
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              const userId = user.id || user.uid;
                              router.push(`/admin/users/${userId}/activity`);
                            }}>
                              <Clock className="mr-2 h-4 w-4" />
                              View Activity
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              toast({
                                title: "Feature not available",
                                description: "Email functionality will be available in a future update.",
                              });
                            }}>
                              <Mail className="mr-2 h-4 w-4" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => {
                              toast({
                                title: "Feature not available",
                                description: "User suspension will be available in a future update.",
                              });
                            }}>
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend User
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                setDeleteModalUser(user);
                                setDeleteConfirmText('');
                              }}
                              disabled={user.role === 'admin'}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Balance Edit Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#003366]">
                  Edit Wallet Balance
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedUser(null);
                    setWalletAmount('');
                    setAdjustmentReason('');
                  }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-4 space-y-2 p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">
                  <strong>User:</strong> {selectedUser.name || 'Unnamed User'}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Email:</strong> {selectedUser.email}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2">
                  <strong>Current Balance:</strong>
                  <div className="flex items-center gap-1 text-[#003366] font-medium">
                    <DollarSign className="h-3 w-3" />
                    <span>{(selectedUser.walletBalance || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="walletAmount" className="text-sm font-medium text-gray-700">
                    New Wallet Balance (CA$)
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="walletAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={walletAmount}
                      onChange={(e) => setWalletAmount(e.target.value)}
                      placeholder="Enter wallet balance"
                      className="mt-1 pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const currentBalance = selectedUser.walletBalance || 0;
                      const newBalance = parseFloat(walletAmount) || 0;
                      const change = newBalance - currentBalance;
                      return (
                        <>
                          Current: CA${currentBalance.toFixed(2)}
                          {walletAmount && !isNaN(parseFloat(walletAmount)) && (
                            <span className="ml-2">
                              → Change: {change >= 0 ? '+' : ''}CA${change.toFixed(2)}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </p>
                </div>

                <div>
                  <Label htmlFor="adjustmentReason" className="text-sm font-medium text-gray-700">
                    Reason (Optional)
                  </Label>
                  <Textarea
                    id="adjustmentReason"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="Enter reason for wallet balance adjustment..."
                    rows={3}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be recorded in the transaction history.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedUser(null);
                    setWalletAmount('');
                    setAdjustmentReason('');
                  }}
                  disabled={updating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateWalletBalance}
                  disabled={updating || !walletAmount || isNaN(parseFloat(walletAmount)) || parseFloat(walletAmount) < 0}
                  className="flex-1 bg-[#003366] hover:bg-[#004080]"
                >
                  {updating ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Balance'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Free Trial Management Modal */}
      {freeTrialModalUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#003366]">
                  Manage Free Trial
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFreeTrialModalUser(null);
                    setFreeTrialMinutes('');
                    setFreeTrialReason('');
                  }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-4 space-y-2 p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">
                  <strong>User:</strong> {freeTrialModalUser.name || 'Unnamed User'}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Email:</strong> {freeTrialModalUser.email}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Current Free Trial:</strong> {freeTrialModalUser.freeTrialMinutes || 0} minutes remaining
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Used:</strong> {freeTrialModalUser.freeTrialMinutesUsed || 0} of {freeTrialModalUser.freeTrialMinutesTotal || 60} minutes
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Status:</strong>{' '}
                  <span className={freeTrialModalUser.freeTrialActive ? 'text-green-600 font-medium' : 'text-gray-500'}>
                    {freeTrialModalUser.freeTrialActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="freeTrialMinutes" className="text-sm font-medium text-gray-700">
                    Free Trial Minutes
                  </Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="freeTrialMinutes"
                      type="number"
                      min="0"
                      step="1"
                      value={freeTrialMinutes}
                      onChange={(e) => setFreeTrialMinutes(e.target.value)}
                      placeholder="Enter free trial minutes"
                      className="mt-1 pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const currentMinutes = freeTrialModalUser.freeTrialMinutes || 0;
                      const newMinutes = parseFloat(freeTrialMinutes) || 0;
                      const change = newMinutes - currentMinutes;
                      return (
                        <>
                          Current: {currentMinutes} minutes
                          {freeTrialMinutes && !isNaN(parseFloat(freeTrialMinutes)) && (
                            <span className="ml-2">
                              → Change: {change >= 0 ? '+' : ''}{change} minutes
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </p>
                </div>

                <div>
                  <Label htmlFor="freeTrialReason" className="text-sm font-medium text-gray-700">
                    Reason (Optional)
                  </Label>
                  <Textarea
                    id="freeTrialReason"
                    value={freeTrialReason}
                    onChange={(e) => setFreeTrialReason(e.target.value)}
                    placeholder="Enter reason for free trial adjustment..."
                    rows={3}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will be recorded in the user&apos;s activity log.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFreeTrialModalUser(null);
                    setFreeTrialMinutes('');
                    setFreeTrialReason('');
                  }}
                  disabled={updating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateFreeTrial}
                  disabled={updating || !freeTrialMinutes || isNaN(parseFloat(freeTrialMinutes)) || parseFloat(freeTrialMinutes) < 0}
                  className="flex-1 bg-[#003366] hover:bg-[#004080]"
                >
                  {updating ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update Free Trial'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteModalUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-red-800">
                  Delete User Account
                </h3>
              </div>

              <div className="mb-4 space-y-2 p-3 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">
                  <strong>User:</strong> {deleteModalUser.name || 'Unnamed User'}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Email:</strong> {deleteModalUser.email}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Wallet Balance:</strong> CA${(deleteModalUser.walletBalance || 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">
                  <strong>Total Jobs:</strong> {deleteModalUser.totalJobs || 0}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-gray-700">
                  This action is <strong>permanent and cannot be undone</strong>. This will delete:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                  <li>User profile and authentication</li>
                  <li>All transcriptions and uploaded files</li>
                  <li>Transaction and billing history</li>
                  <li>All associated data</li>
                </ul>
              </div>

              <div className="mb-6">
                <Label htmlFor="adminDeleteConfirm" className="text-sm font-medium text-gray-700">
                  Type <strong>DELETE</strong> to confirm
                </Label>
                <Input
                  id="adminDeleteConfirm"
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="mt-1"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteModalUser(null);
                    setDeleteConfirmText('');
                  }}
                  disabled={deleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteUser}
                  disabled={deleting || deleteConfirmText !== 'DELETE'}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete User'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

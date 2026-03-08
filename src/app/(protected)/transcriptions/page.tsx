"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { generateTemplateData, exportTranscriptPDF, exportTranscriptDOCX } from '@/lib/utils/transcriptTemplate';
import { FileText, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { getTranscriptionsByUser } from '@/lib/firebase/transcriptions';
import { TranscriptionJob, updateTranscriptionStatus } from '@/lib/firebase/transcriptions';
import { Timestamp } from 'firebase/firestore';
import { formatDuration } from '@/lib/utils';


export default function TranscriptionsPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [transcriptions, setTranscriptions] = useState<TranscriptionJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [isPolling, setIsPolling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Load transcriptions from Firestore
  const loadTranscriptions = async (showLoading = true) => {
    if (!user) return;
    
    try {
      if (showLoading) setLoading(true);
      const userTranscriptions = await getTranscriptionsByUser(user.uid);
      setTranscriptions(userTranscriptions);
      
      // Check if there are any processing jobs
      const hasProcessingJobs = userTranscriptions.some(t => 
        t.status === 'processing'
      );
      setIsPolling(hasProcessingJobs);
      
    } catch (error) {
      console.error('Error loading transcriptions:', error);
      if (showLoading) {
        toast({
          title: 'Error loading transcriptions',
          description: 'Please try refreshing the page.',
          variant: 'destructive'
        });
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadTranscriptions();
  }, [user]);

  // Auto-refresh when there are processing jobs
  useEffect(() => {
    if (!isPolling || !user) return;

    console.log('Starting auto-refresh for processing jobs...');
    const interval = setInterval(() => {
      loadTranscriptions(false); // Don't show loading spinner for background updates
    }, 5000); // Check every 5 seconds

    return () => {
      console.log('Stopping auto-refresh');
      clearInterval(interval);
    };
  }, [isPolling, user]);

  // Filter transcriptions based on search and filters
  const filteredTranscriptions = useMemo(() => {
    return transcriptions.filter(transcription => {
      const matchesSearch = transcription.originalFilename?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || transcription.status === statusFilter;

      // Convert mode to display name for filtering
      const modeDisplayName = transcription.mode === 'ai' ? 'AI Transcription' :
                             transcription.mode === 'hybrid' ? 'Hybrid Review' :
                             transcription.mode === 'human' ? 'Dictation & Human' : transcription.mode;
      const matchesMode = modeFilter === 'all' || modeDisplayName === modeFilter;

      return matchesSearch && matchesStatus && matchesMode;
    });
  }, [transcriptions, searchTerm, statusFilter, modeFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTranscriptions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTranscriptions = filteredTranscriptions.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, modeFilter]);

  const handleDownload = async (transcription: TranscriptionJob, format: 'pdf' | 'docx' = 'pdf') => {
    try {
      console.log('Transcriptions page download - transcription data:', {
        id: transcription.id,
        hasTimestampedTranscript: !!transcription.timestampedTranscript,
        timestampedSegmentsCount: transcription.timestampedTranscript?.length || 0,
        hasTranscript: !!transcription.transcript,
        transcriptLength: transcription.transcript?.length || 0,
        status: transcription.status,
        timestampedSample: transcription.timestampedTranscript?.slice(0, 2),
        allKeys: Object.keys(transcription || {})
      });
      console.log('Transcriptions page download - user data:', userData);

      // Generate template data using our professional template system
      const templateData = generateTemplateData(transcription, userData);
      console.log('Transcriptions page download - generated template data:', {
        hasTimestampedTranscript: !!templateData.timestampedTranscript,
        timestampedSegmentsCount: templateData.timestampedTranscript?.length || 0,
        fileName: templateData.fileName
      });

      if (format === 'pdf') {
        await exportTranscriptPDF(templateData);
      } else if (format === 'docx') {
        await exportTranscriptDOCX(templateData);
      }

      toast({ title: 'Download started', description: `Transcript downloaded as ${format.toUpperCase()}` });
    } catch (error) {
      console.error('Download error:', error);
      toast({ title: 'Download failed', description: 'Please try again', variant: 'destructive' });
    }
  };

  const handleRetry = async (transcriptionId: string) => {
    try {
      // For AI/hybrid modes, set back to processing status for retry
      const transcription = transcriptions.find(t => t.id === transcriptionId);
      if (!transcription) return;
      
      let retryStatus: 'processing' | 'pending-transcription';
      if (transcription.mode === 'human') {
        retryStatus = 'pending-transcription';
      } else {
        retryStatus = 'processing';
      }
      
      await updateTranscriptionStatus(transcriptionId, retryStatus);
      
      // Update local state
      setTranscriptions(prev => 
        prev.map(t => t.id === transcriptionId ? { ...t, status: retryStatus } : t)
      );
      
      const statusMessage = retryStatus === 'processing' ? 'processing' : 'transcription queue';
      toast({ 
        title: 'Retry initiated', 
        description: `The transcription has been moved back to ${statusMessage}.` 
      });
    } catch (error) {
      console.error('Error retrying transcription:', error);
      toast({ title: 'Retry failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#003366] mb-2">
                My Transcriptions
              </h1>
              <p className="text-gray-600">
                View and manage all your transcription jobs.
              </p>
            </div>
            {isPolling && (
              <div className="flex items-center text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm font-medium">Auto-refreshing...</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="border-0 shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search transcriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="pending-review">Pending Review</SelectItem>
                    <SelectItem value="pending-transcription">Pending Transcription</SelectItem>
                    <SelectItem value="under-review">Under Review</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="AI Transcription">AI Transcription</SelectItem>
                    <SelectItem value="Hybrid Review">Hybrid Review</SelectItem>
                    <SelectItem value="Dictation & Human">Dictation & Human</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        {!loading && (
          <div className="mb-6 text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredTranscriptions.length)} of {filteredTranscriptions.length} transcriptions
            {(searchTerm || statusFilter !== 'all' || modeFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setModeFilter('all');
                }}
                className="ml-4 text-[#b29dd9] hover:text-[#9d87c7]"
              >
                Clear filters
              </Button>
            )}
          </div>
        )}

        {/* Transcriptions List */}
        <Card className="border-0 shadow-sm w-full">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#003366]">
              Transcriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="w-full">
            <div className="space-y-4 w-full">
              {loading && (
                <div className="text-center text-gray-500 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366] mx-auto mb-4"></div>
                  Loading transcriptions...
                </div>
              )}
              
              {!loading && paginatedTranscriptions.map((transcription) => (
                <div
                  key={transcription.id}
                  className="w-full flex items-center justify-between p-6 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <FileText className="h-5 w-5 text-[#b29dd9] flex-shrink-0" />
                      <h3 className="font-semibold text-[#003366] text-lg truncate flex-1" title={transcription.originalFilename}>
                        {transcription.originalFilename}
                      </h3>
                      <StatusBadge status={transcription.status} className="flex-shrink-0" />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 font-medium">Mode:</span>
                        <p className="text-[#003366]">
                          {transcription.mode === 'ai' ? 'AI Transcription' :
                           transcription.mode === 'hybrid' ? 'Hybrid Review' :
                           transcription.mode === 'human' ? 'Dictation & Human' : transcription.mode}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Duration:</span>
                        <p className="text-[#003366]">{formatDuration(transcription.duration)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">Credits Used:</span>
                        <CreditDisplay amount={transcription.creditsUsed} size="sm" />
                      </div>
                      <div>
                        <span className="text-gray-600 font-medium">
                          {transcription.completedAt ? 'Completed:' : 'Uploaded:'}
                        </span>
                        <p className="text-[#003366]">
                          {transcription.completedAt
                            ? (transcription.completedAt as Timestamp).toDate().toLocaleDateString()
                            : (transcription.createdAt as Timestamp).toDate().toLocaleDateString()
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-6">
                    {transcription.status === 'complete' && (
                      <>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(transcription, 'pdf')}
                            className="border-[#b29dd9] text-[#b29dd9] hover:bg-[#b29dd9] hover:text-white"
                          >
                            PDF
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(transcription, 'docx')}
                            className="border-[#b29dd9] text-[#b29dd9] hover:bg-[#b29dd9] hover:text-white"
                          >
                            DOCX
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          asChild
                          className="bg-[#003366] hover:bg-[#002244] text-white"
                        >
                          <Link href={`/transcript/${transcription.id}`}>
                            View
                          </Link>
                        </Button>
                      </>
                    )}
                    
                    {transcription.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(transcription.id)}
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      >
                        Retry
                      </Button>
                    )}
                    
                    {(transcription.status === 'processing' || 
                      transcription.status === 'under-review' || 
                      transcription.status === 'queued' ||
                      transcription.status === 'pending-review' ||
                      transcription.status === 'pending-transcription') && (
                      <div className="text-sm text-gray-500 px-3 py-2 bg-gray-100 rounded">
                        In progress...
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {!loading && filteredTranscriptions.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No transcriptions found
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {searchTerm || statusFilter !== 'all' || modeFilter !== 'all'
                      ? 'Try adjusting your search or filters.'
                      : 'Upload your first audio or video file to get started.'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && modeFilter === 'all' && (
                    <Button asChild className="bg-[#003366] hover:bg-[#002244] text-white">
                      <Link href="/upload">
                        Upload File
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {/* Pagination */}
              {!loading && filteredTranscriptions.length > 0 && totalPages > 1 && (
                <div className="w-full mt-6 pt-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-2 flex-wrap justify-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="flex items-center space-x-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Previous</span>
                      </Button>

                      <div className="flex items-center space-x-1 flex-wrap">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Show first page, last page, current page, and pages around current page
                          const isVisible = page === 1 ||
                                           page === totalPages ||
                                           (page >= currentPage - 2 && page <= currentPage + 2);

                          if (!isVisible) {
                            // Show ellipsis for gaps
                            if (page === currentPage - 3 || page === currentPage + 3) {
                              return <span key={page} className="px-2 text-gray-400">...</span>;
                            }
                            return null;
                          }

                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 p-0 flex-shrink-0 ${
                                currentPage === page
                                  ? 'bg-[#003366] text-white'
                                  : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {page}
                            </Button>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="flex items-center space-x-1"
                      >
                        <span>Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-sm text-gray-600 flex-shrink-0">
                      Page {currentPage} of {totalPages}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
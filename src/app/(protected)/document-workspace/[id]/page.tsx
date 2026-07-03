"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Download, FileText, Mic, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { getTranscriptionById, requestFileDeletion, TranscriptionJob } from '@/lib/firebase/transcriptions';
import { formatDuration } from '@/lib/utils';
import { formatRetentionLabel, isRetentionDeleted, toRetentionDate } from '@/lib/utils/retention';

const getOfficeServiceLabel = (serviceType?: string) => {
  switch (serviceType) {
    case 'dictation-cleanup':
      return 'Audio instructions for document preparation';
    case 'copy-typing':
      return 'Copy typing';
    case 'handwriting-transcription':
      return 'Handwriting transcription';
    case 'document-preparation':
      return 'Document preparation';
    default:
      return 'Document Workspace';
  }
};

const formatDate = (value: unknown) => {
  const date = toRetentionDate(value as Parameters<typeof toRetentionDate>[0]);
  if (!date) return null;

  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);
};

export default function DocumentWorkspaceProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();
  const [project, setProject] = useState<TranscriptionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestingFileDeletion, setRequestingFileDeletion] = useState(false);
  const [deletionRequestMessage, setDeletionRequestMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      if (!user || !id) return;

      try {
        setLoading(true);
        setError(null);
        const projectData = await getTranscriptionById(id);

        if (!projectData || projectData.type !== 'office') {
          setError('Document Workspace project not found.');
          return;
        }

        if (projectData.userId !== user.uid) {
          setError('You do not have permission to view this Document Workspace project.');
          return;
        }

        setProject(projectData);
      } catch (loadError) {
        console.error('Error loading Document Workspace project:', loadError);
        setError('Unable to load this Document Workspace project. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [id, user]);

  const retentionLabel = project ? formatRetentionLabel(project) : null;
  const retentionDeleted = project ? isRetentionDeleted(project) : false;
  const submittedDate = project ? formatDate(project.createdAt) : null;
  const dueDate = project ? formatDate(project.officeDueDate) : null;
  const completedDocumentDownloadHref = project?.officeCompletedDocumentPath
    ? `/api/document-workspace/${project.id}/completed-document`
    : project?.officeCompletedDocumentURL;
  const completedDocumentAvailable = Boolean(completedDocumentDownloadHref && !retentionDeleted);
  const sourceFileDownloadHref = project?.filePath
    ? `/api/document-workspace/${project.id}/source-file`
    : project?.downloadURL;
  const voiceInstructionsHref = project?.voiceInstructionsPath
    ? `/api/document-workspace/${project.id}/voice-instructions`
    : project?.voiceInstructionsURL;
  const templateDownloadHref = project?.templatePath
    ? `/api/document-workspace/${project.id}/template`
    : project?.templateURL;

  const handleRequestFileDeletion = async () => {
    if (!project?.id || !user?.uid) return;
    if (project.deletionRequested) return;

    const confirmed = window.confirm(
      "Are you sure you want to request deletion of this project's files? Talk to Text Canada will review the request and process it according to the file retention policy."
    );

    if (!confirmed) return;

    setRequestingFileDeletion(true);
    setDeletionRequestMessage(null);
    try {
      await requestFileDeletion(project.id, user.uid);
      setProject(prev => prev ? {
        ...prev,
        deletionRequested: true,
        deletionRequestedBy: user.uid,
        deletionRequestStatus: 'requested'
      } : prev);
      setDeletionRequestMessage(
        'Your deletion request has been received. Talk to Text Canada will review and process it according to the file retention policy.'
      );
    } catch (requestError) {
      console.error('File deletion request error:', requestError);
      setDeletionRequestMessage('Unable to submit the deletion request. Please try again.');
    } finally {
      setRequestingFileDeletion(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 max-w-3xl mx-auto px-4 py-12">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-bold text-[#003366] mb-3">Document Workspace Project</h1>
              <p className="text-gray-600 mb-6">{error || 'Document Workspace project not found.'}</p>
              <Button onClick={() => router.push('/dashboard')} className="bg-[#003366] hover:bg-[#002244]">
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button variant="ghost" asChild className="mb-4 text-[#003366] hover:bg-blue-50">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#003366]">Document Workspace Project</h1>
              <p className="mt-2 text-gray-600">{project.originalFilename || project.filename}</p>
            </div>
            <StatusBadge status={project.status} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#003366]">Project details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Service</p>
                  <p className="mt-1 text-sm text-gray-800">{getOfficeServiceLabel(project.officeServiceType)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Submitted</p>
                  <p className="mt-1 text-sm text-gray-800">{submittedDate || 'Not available'}</p>
                </div>
                {project.duration > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Media duration</p>
                    <p className="mt-1 text-sm text-gray-800">{formatDuration(project.duration)}</p>
                  </div>
                )}
                {dueDate && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Due date</p>
                    <p className="mt-1 text-sm text-gray-800">{dueDate}</p>
                  </div>
                )}
                {retentionLabel && (
                  <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className={`text-sm ${retentionDeleted ? 'font-medium text-red-700' : 'text-slate-700'}`}>
                      {retentionLabel}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#003366]">Uploaded materials</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-[#003366] mt-0.5" />
                      <div>
                        <p className="font-medium text-gray-900">Main uploaded file</p>
                        <p className="text-sm text-gray-600 break-words">{project.originalFilename || project.filename}</p>
                      </div>
                    </div>
                    {!retentionDeleted && sourceFileDownloadHref && (
                      <Button variant="outline" size="sm" asChild className="border-[#003366] text-[#003366]">
                        <a
                          href={sourceFileDownloadHref}
                          {...(!project.filePath ? {
                            target: '_blank',
                            rel: 'noopener noreferrer',
                          } : {})}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Open
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {templateDownloadHref && (
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium text-purple-950">Optional template or reference document</p>
                        <p className="text-sm text-purple-800 break-words">{project.templateFilename || 'Reference file'}</p>
                      </div>
                      {!retentionDeleted && (
                        <Button variant="outline" size="sm" asChild className="border-purple-300 text-purple-700">
                          <a
                            href={templateDownloadHref}
                            {...(!project.templatePath ? {
                              target: '_blank',
                              rel: 'noopener noreferrer',
                            } : {})}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {project.specialInstructions && (
                  <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
                    <p className="font-medium text-cyan-950">Written instructions</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-cyan-900">{project.specialInstructions}</p>
                  </div>
                )}

                {project.officeNotes && (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="font-medium text-gray-900">Additional notes</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{project.officeNotes}</p>
                  </div>
                )}

                {project.hasVoiceInstructions && voiceInstructionsHref && (
                  <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-3">
                        <Mic className="h-5 w-5 text-indigo-700 mt-0.5" />
                        <div>
                          <p className="font-medium text-indigo-950">Voice instructions</p>
                          <p className="text-sm text-indigo-800">
                            {project.voiceInstructionsFilename || 'Client-recorded voice instructions'}
                            {project.voiceInstructionsDuration ? ` · ${formatDuration(project.voiceInstructionsDuration)}` : ''}
                          </p>
                        </div>
                      </div>
                      {!retentionDeleted && (
                        <Button variant="outline" size="sm" asChild className="border-indigo-300 text-indigo-700">
                          <a
                            href={voiceInstructionsHref}
                            {...(!project.voiceInstructionsPath ? {
                              target: '_blank',
                              rel: 'noopener noreferrer',
                            } : {})}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </a>
                        </Button>
                      )}
                    </div>
                    {!retentionDeleted && <audio controls src={voiceInstructionsHref} className="w-full" />}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#003366]">Completed document</CardTitle>
              </CardHeader>
              <CardContent>
                {retentionDeleted ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
                    Files expired/deleted.
                  </div>
                ) : completedDocumentAvailable ? (
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium text-gray-900">{project.officeCompletedFilename || 'Completed document'}</p>
                      {retentionLabel && (
                        <p className="mt-2 text-sm text-gray-600">{retentionLabel}</p>
                      )}
                    </div>
                    <Button asChild className="w-full bg-[#003366] hover:bg-[#002244]">
                      <a
                        href={completedDocumentDownloadHref}
                        download={project.officeCompletedFilename || 'completed-document'}
                        {...(!project.officeCompletedDocumentPath ? {
                          target: '_blank',
                          rel: 'noopener noreferrer',
                        } : {})}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Completed Document
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    Your completed document is not ready yet. It will appear here when it has been uploaded by Talk to Text Canada.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-[#003366]">File deletion request</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {project.deletionRequested ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                    File deletion has been requested.
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      Request deletion of uploaded and completed files for admin review. Files are not deleted automatically from this request.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-red-300 text-red-700 hover:bg-red-50"
                      onClick={handleRequestFileDeletion}
                      disabled={requestingFileDeletion}
                    >
                      {requestingFileDeletion ? 'Submitting request...' : 'Request File Deletion'}
                    </Button>
                  </>
                )}
                {deletionRequestMessage && (
                  <p className="text-sm text-gray-700">{deletionRequestMessage}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

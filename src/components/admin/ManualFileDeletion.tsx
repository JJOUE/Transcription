'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DeletionJob = {
  id: string;
  userId: string | null;
  filename: string;
  status: string;
  mode: string | null;
  type: string;
  createdAt: string | null;
  completedAt: string | null;
  deletionRequested: boolean;
  deletionRequestStatus: string | null;
  deletionStatus: string | null;
  filesDeletedAt: string | null;
  storedPaths: Array<{ field: string; path: string }>;
};

export function ManualFileDeletion() {
  const [jobId, setJobId] = useState('');
  const [job, setJob] = useState<DeletionJob | null>(null);
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const requestedJobId = new URLSearchParams(window.location.search).get('deleteJob');
    if (requestedJobId) setJobId(requestedJobId);
  }, []);

  const reviewJob = async (event?: FormEvent) => {
    event?.preventDefault();
    const trimmedJobId = jobId.trim();
    if (!trimmedJobId) {
      setError('Enter a job ID.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setJob(null);
    setConfirmed(false);
    try {
      const response = await fetch(`/api/transcriptions/${encodeURIComponent(trimmedJobId)}/delete`);
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || 'Unable to load the job.');
      setJob(data.job);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'Unable to load the job.');
    } finally {
      setLoading(false);
    }
  };

  const deleteFiles = async () => {
    if (!job || !confirmed || !reason.trim()) return;

    setDeleting(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`/api/transcriptions/${encodeURIComponent(job.id)}/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmJobId: job.id, reason: reason.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        const details = data.failed?.length ? ` ${data.failed.length} file(s) failed.` : '';
        throw new Error(`${data.error || 'File deletion failed.'}${details}`);
      }

      setSuccess(
        `Files deleted for job ${job.id}. ${data.deleted.length} deleted; ${data.missing.length} already missing.`
      );
      setJob({ ...job, deletionStatus: 'deleted', filesDeletedAt: new Date().toISOString() });
      setConfirmed(false);
    } catch (deletionError) {
      setError(deletionError instanceof Error ? deletionError.message : 'File deletion failed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card id="manual-file-deletion" className="mb-6 border border-red-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl text-[#003366]">
          <Trash2 className="h-5 w-5 text-red-600" />
          Admin File Deletion
        </CardTitle>
        <p className="text-sm text-gray-600">
          Review and delete files for one specific job. The Firestore job record and billing history remain for audit purposes.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={reviewJob} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="grid flex-1 gap-1.5 text-sm font-medium text-gray-700">
            Job ID
            <input
              value={jobId}
              onChange={event => setJobId(event.target.value)}
              className="h-10 rounded-md border border-gray-300 px-3 font-normal focus:border-[#003366] focus:outline-none focus:ring-2 focus:ring-[#b29dd9]/40"
              placeholder="Paste the exact Firestore job ID"
              autoComplete="off"
            />
          </label>
          <Button type="submit" variant="outline" disabled={loading}>
            {loading ? 'Loading...' : 'Review Job'}
          </Button>
        </form>

        {job && (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p><strong>Filename:</strong> {job.filename}</p>
              <p><strong>Job ID:</strong> <span className="break-all">{job.id}</span></p>
              <p><strong>User ID:</strong> <span className="break-all">{job.userId || 'Missing'}</span></p>
              <p><strong>Status:</strong> {job.status}</p>
              <p><strong>Service:</strong> {job.type === 'office' ? 'Document Workspace' : job.mode || 'Transcription'}</p>
              <p><strong>Created:</strong> {job.createdAt ? new Date(job.createdAt).toLocaleString() : 'Unknown'}</p>
              <p><strong>Stored paths found:</strong> {job.storedPaths.length}</p>
              <p><strong>Deletion request:</strong> {job.deletionRequested ? job.deletionRequestStatus || 'requested' : 'No'}</p>
            </div>

            {job.status === 'complete' && (
              <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900">
                Warning: this job is marked complete. Confirm that this is the duplicate/error job, not the completed work that must remain available.
              </p>
            )}

            {job.deletionStatus === 'deleted' ? (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">Files deleted</p>
            ) : (
              <>
                <label className="grid gap-1.5 text-sm font-medium text-gray-700">
                  Business reason
                  <input
                    value={reason}
                    onChange={event => setReason(event.target.value)}
                    className="h-10 rounded-md border border-gray-300 bg-white px-3 font-normal"
                    placeholder="For example: duplicate client submission"
                  />
                </label>
                <label className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={event => setConfirmed(event.target.checked)}
                    className="mt-0.5"
                  />
                  <span>This will delete the stored files for this job. This cannot be undone. The job record will remain for audit/history.</span>
                </label>
                <Button
                  type="button"
                  onClick={deleteFiles}
                  disabled={deleting || !confirmed || !reason.trim() || !job.userId}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {deleting ? 'Deleting Files...' : 'Delete Files'}
                </Button>
              </>
            )}
          </div>
        )}

        {error && <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>}
      </CardContent>
    </Card>
  );
}

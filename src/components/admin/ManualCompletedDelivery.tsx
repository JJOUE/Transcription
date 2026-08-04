'use client';

import { FormEvent, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getTranscriptionById } from '@/lib/firebase/transcriptions';

type DeliveryResult = {
  jobId: string;
  filename: string;
};

export function ManualCompletedDelivery() {
  const [jobId, setJobId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [projectType, setProjectType] = useState<'document' | 'transcript'>('document');
  const [label, setLabel] = useState('Completed Document');
  const [customLabel, setCustomLabel] = useState('');
  const [hasExistingCompletedFile, setHasExistingCompletedFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DeliveryResult | null>(null);

  const inspectJob = async () => {
    const trimmedJobId = jobId.trim();
    if (!trimmedJobId) return;

    try {
      const job = await getTranscriptionById(trimmedJobId);
      if (!job) return;

      const nextType = job.type === 'office' ? 'document' : 'transcript';
      const hasCompletedFile = Boolean(
        job.completedFiles?.length ||
        job.officeCompletedDocumentPath ||
        job.finishedTranscriptPath
      );
      setProjectType(nextType);
      setHasExistingCompletedFile(hasCompletedFile);
      setLabel(hasCompletedFile
        ? nextType === 'document' ? 'Revised Document' : 'Revised Transcript'
        : nextType === 'document' ? 'Completed Document' : 'Completed Transcript'
      );
    } catch (lookupError) {
      console.error('[Manual Delivery] Could not inspect job:', lookupError);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setError('');
    setResult(null);

    const trimmedJobId = jobId.trim();
    const deliveryLabel = label === 'custom' ? customLabel.trim() : label;
    if (!trimmedJobId || !file || !deliveryLabel) {
      setError('Enter the job ID, choose a label, and select a completed file.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('label', deliveryLabel);

      const response = await fetch(
        projectType === 'document'
          ? `/api/document-workspace/${encodeURIComponent(trimmedJobId)}/completed-document`
          : `/api/transcripts/${encodeURIComponent(trimmedJobId)}/finished-transcript`,
        { method: 'POST', body: formData }
      );
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || 'The completed document could not be delivered.');
      }

      setResult({ jobId: data.jobId, filename: data.filename });
      setFile(null);
      const input = form.elements.namedItem('completedDocument');
      if (input instanceof HTMLInputElement) input.value = '';
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'The upload failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mb-6 border border-[#b29dd9] shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl text-[#003366]">
          <Upload className="h-5 w-5" />
          Manual Completed Work Delivery
        </CardTitle>
        <p className="text-sm text-gray-600">
          Deliver an original or revised completed file by job ID, including projects hidden from the active queue. Existing completed files are preserved as previous versions.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_0.8fr_1fr_1fr_auto] xl:items-end">
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">
            Job ID
            <input
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              onBlur={inspectJob}
              className="h-10 rounded-md border border-gray-300 px-3 font-normal focus:border-[#003366] focus:outline-none focus:ring-2 focus:ring-[#b29dd9]/40"
              placeholder="Paste the Firestore job ID"
              autoComplete="off"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">
            Project type
            <select
              value={projectType}
              onChange={(event) => {
                const nextType = event.target.value as 'document' | 'transcript';
                setProjectType(nextType);
                setLabel(nextType === 'document' ? 'Completed Document' : 'Completed Transcript');
              }}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 font-normal focus:border-[#003366] focus:outline-none focus:ring-2 focus:ring-[#b29dd9]/40"
            >
              <option value="document">Document Workspace</option>
              <option value="transcript">Transcript</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">
            File label
            <select
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="h-10 rounded-md border border-gray-300 bg-white px-3 font-normal focus:border-[#003366] focus:outline-none focus:ring-2 focus:ring-[#b29dd9]/40"
            >
              <option value="Completed Transcript">Completed Transcript</option>
              <option value="Revised Transcript">Revised Transcript</option>
              <option value="Corrected Transcript">Corrected Transcript</option>
              <option value="Revised Document">Revised Document</option>
              <option value="Completed Document">Completed Document</option>
              <option value="custom">Other custom label</option>
            </select>
          </label>
          {label === 'custom' && (
            <label className="grid gap-1.5 text-sm font-medium text-gray-700">
              Custom label
              <input
                value={customLabel}
                onChange={(event) => setCustomLabel(event.target.value)}
                maxLength={80}
                className="h-10 rounded-md border border-gray-300 px-3 font-normal focus:border-[#003366] focus:outline-none focus:ring-2 focus:ring-[#b29dd9]/40"
                placeholder="Enter a clear client-facing label"
              />
            </label>
          )}
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">
            Completed file
            <input
              name="completedDocument"
              type="file"
              accept={projectType === 'document' ? '.docx,.pdf,.txt' : '.docx,.pdf,.txt,.srt,.vtt'}
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="block h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
          </label>
          <Button type="submit" disabled={submitting} className="bg-[#003366] hover:bg-[#00264d]">
            {submitting ? 'Delivering...' : hasExistingCompletedFile ? 'Add Revised Version' : 'Deliver Completed File'}
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {result && (
          <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Completed file delivered for job {result.jobId}: {result.filename}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

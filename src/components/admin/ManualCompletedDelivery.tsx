'use client';

import { FormEvent, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type DeliveryResult = {
  jobId: string;
  filename: string;
};

export function ManualCompletedDelivery() {
  const [jobId, setJobId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DeliveryResult | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    setError('');
    setResult(null);

    const trimmedJobId = jobId.trim();
    if (!trimmedJobId || !file) {
      setError('Enter the job ID and select a completed document.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `/api/document-workspace/${encodeURIComponent(trimmedJobId)}/completed-document`,
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
          Deliver a completed Document Workspace file by job ID, including projects hidden from the active queue.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">
            Job ID
            <input
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              className="h-10 rounded-md border border-gray-300 px-3 font-normal focus:border-[#003366] focus:outline-none focus:ring-2 focus:ring-[#b29dd9]/40"
              placeholder="Paste the Firestore job ID"
              autoComplete="off"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">
            Completed document
            <input
              name="completedDocument"
              type="file"
              accept=".docx,.pdf,.txt"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="block h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-medium"
            />
          </label>
          <Button type="submit" disabled={submitting} className="bg-[#003366] hover:bg-[#00264d]">
            {submitting ? 'Delivering...' : 'Deliver Completed File'}
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {result && (
          <p role="status" className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            Completed document delivered for job {result.jobId}: {result.filename}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

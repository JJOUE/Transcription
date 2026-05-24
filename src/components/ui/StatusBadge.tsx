import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'queued' | 'processing' | 'under-review' | 'complete' | 'failed' | 'cancelled' | 'pending-review' | 'pending-transcription';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    queued: {
      label: 'Queued',
      className: 'bg-gray-100 text-gray-800 border-gray-200'
    },
    processing: {
        label: 'Processing',
          className: 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse'
    },
    'under-review': {
        label: 'Under Review',
          className: 'bg-indigo-100 text-indigo-800 border-indigo-300'
    },
    'pending-review': {
      label: 'Pending Review',
      className: 'bg-amber-200 text-amber-900 border-amber-400'
    },
    'pending-transcription': {
      label: 'Pending Transcription',
      className: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    complete: {
      label: 'Complete',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    failed: {
      label: 'Failed',
      className: 'bg-red-200 text-red-900 border-red-400'
    },
    cancelled: {
      label: 'Cancelled',
      className: 'bg-gray-100 text-gray-600 border-gray-200'
    }
  };

  const config = statusConfig[status] || {
    label: status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown',
    className: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
type RetentionTimestamp = Date | string | number | { toDate: () => Date } | null | undefined;

export type DeletionStatus = 'active' | 'pending' | 'deleted' | 'error' | 'held';

export interface RetentionAwareJob {
  status?: string;
  officeStatus?: string;
  completedAt?: RetentionTimestamp;
  retentionExpiresAt?: RetentionTimestamp;
  retentionHold?: boolean;
  filesDeletedAt?: RetentionTimestamp;
  deletionStatus?: DeletionStatus;
}

const RETENTION_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const toRetentionDate = (value: RetentionTimestamp): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== 'string' && typeof value !== 'number') return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isRetentionDeleted = (job: RetentionAwareJob): boolean =>
  Boolean(job.filesDeletedAt || job.deletionStatus === 'deleted');

const hasRetentionClockStarted = (job: RetentionAwareJob): boolean =>
  job.status === 'complete' || job.officeStatus === 'delivered';

export const getRetentionExpiryDate = (job: RetentionAwareJob): Date | null => {
  const explicitExpiry = toRetentionDate(job.retentionExpiresAt);
  if (explicitExpiry) return explicitExpiry;

  if (!hasRetentionClockStarted(job)) return null;

  const completedAt = toRetentionDate(job.completedAt);
  if (!completedAt) return null;

  return new Date(completedAt.getTime() + RETENTION_DAYS * MS_PER_DAY);
};

export const getRetentionStatus = (job: RetentionAwareJob): DeletionStatus | null => {
  if (isRetentionDeleted(job)) return 'deleted';
  if (job.retentionHold || job.deletionStatus === 'held') return 'held';

  const expiryDate = getRetentionExpiryDate(job);
  if (expiryDate) return job.deletionStatus || 'active';

  return job.deletionStatus || null;
};

export const formatRetentionDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);

export const formatRetentionLabel = (job: RetentionAwareJob): string | null => {
  if (isRetentionDeleted(job)) return 'Files expired/deleted';
  if (job.retentionHold || job.deletionStatus === 'held') return 'Retention hold';

  const expiryDate = getRetentionExpiryDate(job);
  if (!expiryDate) return null;

  return `Files expire on ${formatRetentionDate(expiryDate)}`;
};

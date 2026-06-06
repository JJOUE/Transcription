type RetentionTimestamp = Date | string | number | { toDate: () => Date } | null | undefined;

export type DeletionStatus = 'active' | 'archived' | 'pending' | 'deleted' | 'error' | 'held';
export type RetentionPhase = 'active' | 'archived' | 'pending-deletion' | 'deleted' | 'held';
export type RetentionWarningLevel = 'none' | 'warning' | 'urgent' | 'past-due';

export interface RetentionAwareJob {
  status?: string;
  officeStatus?: string;
  completedAt?: RetentionTimestamp;
  retentionArchiveAt?: RetentionTimestamp;
  retentionExpiresAt?: RetentionTimestamp;
  retentionHold?: boolean;
  filesDeletedAt?: RetentionTimestamp;
  deletionStatus?: DeletionStatus;
}

const RETENTION_ARCHIVE_DAYS = 30;
const RETENTION_DELETE_DAYS = 90;
const RETENTION_WARNING_DAYS = 14;
const RETENTION_URGENT_DAYS = 7;
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

const getFallbackRetentionDate = (job: RetentionAwareJob, daysAfterCompletion: number): Date | null => {
  if (!hasRetentionClockStarted(job)) return null;

  const completedAt = toRetentionDate(job.completedAt);
  if (!completedAt) return null;

  return new Date(completedAt.getTime() + daysAfterCompletion * MS_PER_DAY);
};

export const getRetentionArchiveDate = (job: RetentionAwareJob): Date | null => {
  const explicitArchiveDate = toRetentionDate(job.retentionArchiveAt);
  if (explicitArchiveDate) return explicitArchiveDate;

  return getFallbackRetentionDate(job, RETENTION_ARCHIVE_DAYS);
};

export const getRetentionDeleteDate = (job: RetentionAwareJob): Date | null => {
  const explicitDeleteDate = toRetentionDate(job.retentionExpiresAt);
  if (explicitDeleteDate) return explicitDeleteDate;

  return getFallbackRetentionDate(job, RETENTION_DELETE_DAYS);
};

export const getRetentionExpiryDate = getRetentionDeleteDate;

const getDaysUntil = (date: Date, now = new Date()): number =>
  Math.ceil((date.getTime() - now.getTime()) / MS_PER_DAY);

export const getRetentionWarningLevel = (
  job: RetentionAwareJob,
  now = new Date()
): RetentionWarningLevel => {
  if (isRetentionDeleted(job)) return 'none';
  if (job.retentionHold || job.deletionStatus === 'held') return 'none';

  const deleteDate = getRetentionDeleteDate(job);
  if (!deleteDate) return 'none';

  const daysUntilDelete = getDaysUntil(deleteDate, now);
  if (daysUntilDelete < 0) return 'past-due';
  if (daysUntilDelete <= RETENTION_URGENT_DAYS) return 'urgent';
  if (daysUntilDelete <= RETENTION_WARNING_DAYS) return 'warning';

  return 'none';
};

export const getRetentionStatus = (job: RetentionAwareJob): DeletionStatus | null => {
  if (isRetentionDeleted(job)) return 'deleted';
  if (job.retentionHold || job.deletionStatus === 'held') return 'held';

  const deleteDate = getRetentionDeleteDate(job);
  if (deleteDate) return job.deletionStatus || 'active';

  return job.deletionStatus || null;
};

export const getRetentionPhase = (
  job: RetentionAwareJob,
  now = new Date()
): RetentionPhase | null => {
  if (isRetentionDeleted(job)) return 'deleted';
  if (job.retentionHold || job.deletionStatus === 'held') return 'held';

  const archiveDate = getRetentionArchiveDate(job);
  const deleteDate = getRetentionDeleteDate(job);
  if (!archiveDate || !deleteDate) return null;

  if (now.getTime() > deleteDate.getTime()) return 'pending-deletion';
  if (now.getTime() >= archiveDate.getTime()) return 'archived';

  return 'active';
};

export const formatRetentionDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(date);

export const formatRetentionLabel = (job: RetentionAwareJob): string | null => {
  if (isRetentionDeleted(job)) return 'Files expired/deleted';
  if (job.retentionHold || job.deletionStatus === 'held') {
    return 'Retention hold — files will not be archived or deleted automatically.';
  }

  const archiveDate = getRetentionArchiveDate(job);
  const deleteDate = getRetentionDeleteDate(job);
  if (!archiveDate || !deleteDate) return null;

  const deleteLabel = formatRetentionDate(deleteDate);
  const warningLevel = getRetentionWarningLevel(job);
  if (warningLevel === 'past-due') return 'Past retention date — deletion pending.';
  if (warningLevel === 'urgent') return `Urgent: files delete on ${deleteLabel}. Download now if needed.`;
  if (warningLevel === 'warning') {
    return `Files scheduled for deletion on ${deleteLabel}. Please download anything you need.`;
  }

  const phase = getRetentionPhase(job);
  if (phase === 'archived') return `Archived — available until ${deleteLabel}.`;
  if (phase === 'active') {
    return `Files active until ${formatRetentionDate(archiveDate)}. Files delete on ${deleteLabel}.`;
  }

  return null;
};

import { adminDb } from '@/lib/firebase/admin';
import { RUSH_SURCHARGE_RATES, TRANSCRIPTION_MODE_RATES } from '@/lib/billing/transcription-rates';
import type { HelpActionId, ClientHelpAction } from './types';

type AccountFacts = { ai: number; hybrid: number; human: number; trial: number };

const actionRoutes: Partial<Record<HelpActionId, string>> = {
  show_service_comparison: '/pricing', show_workspace_comparison: '/guide#workspace-comparison',
  recommend_service: '/pricing', open_transcript_upload: '/upload', open_document_upload: '/office/upload',
  open_pricing_page: '/pricing', open_guide_section: '/guide', open_contact_page: '/contact',
  show_project_status: '/dashboard', escalate_to_support: '/contact',
};

const actionLabels: Record<HelpActionId, string> = {
  show_service_comparison: 'Compare transcription services', show_workspace_comparison: 'Compare workspaces',
  recommend_service: 'View recommended services', open_transcript_upload: 'Create a transcript',
  open_document_upload: 'Prepare a finished document', open_pricing_page: 'View pricing',
  open_guide_section: 'Open the Help & Guide', open_contact_page: 'Contact Talk to Text Canada',
  show_account_balances: 'View available minutes', show_project_status: 'View project status',
  escalate_to_support: 'Contact Talk to Text Canada',
};

export async function loadApprovedServiceData() {
  const pricingSnapshot = await adminDb.collection('settings').doc('pricing').get();
  const configuredRates = pricingSnapshot.data()?.payAsYouGo as Partial<typeof TRANSCRIPTION_MODE_RATES> | undefined;
  const rates = { ...TRANSCRIPTION_MODE_RATES, ...configuredRates };
  return {
    currency: 'CAD',
    services: {
      ai: { name: 'AI Transcription', ratePerAudioMinute: rates.ai, description: 'Automatically generated. Fastest and lowest-cost. The client should review carefully.' },
      hybrid: { name: 'Hybrid Transcription', ratePerAudioMinute: rates.hybrid, description: 'AI-generated first, then reviewed and corrected by a human. More accurate than AI-only and less expensive than fully Human Transcription.' },
      human: { name: 'Human Transcription', ratePerAudioMinute: rates.human, description: 'Completed and reviewed by a person, with the highest level of human attention. Best for important, complex, professional, or difficult recordings.' },
    },
    workspaces: {
      transcript: 'Creates a transcript from audio or video. It supports AI, Hybrid, and Human Transcription and includes transcript review, editing, formatting, and downloads.',
      document: 'Prepares a finished document from dictation, handwriting, copy typing, instructions, or a supplied template. The result is a document, not a transcript.',
      separation: 'The workspaces are separate. Files and projects do not transfer between them automatically, and they do not share an editor.',
    },
    speakerRule: { threshold: 'One to four speakers are included. Recordings with more than four speakers require a custom quote.', perAudioMinute: {} },
    rushPerAudioMinute: RUSH_SURCHARGE_RATES,
    packages: 'Package eligibility depends on service type. Package minutes are reduced only by submitted audio duration. Hybrid and Human package add-ons are paid separately through secure checkout.',
    uploads: {
      transcript: { accepted: ['audio', 'video'], route: '/upload' },
      document: { accepted: ['audio', 'video', 'DOC', 'DOCX', 'PDF', 'TXT', 'JPG', 'PNG', 'HEIC'], maxPrimaryFile: '1 GB', maxTemplate: '50 MB', route: '/office/upload' },
    },
    contact: { route: '/contact', phone: '(289) 499-3536' },
  };
}

export async function loadAccountFacts(uid: string): Promise<AccountFacts> {
  const snapshot = await adminDb.collection('users').doc(uid).get();
  const data = snapshot.data() || {};
  const totals: AccountFacts = { ai: 0, hybrid: 0, human: 0, trial: Math.max(0, Number(data.freeTrialMinutes) || 0) };
  for (const pkg of Array.isArray(data.packages) ? data.packages : []) {
    const type = pkg?.type as 'ai' | 'hybrid' | 'human';
    if ((type === 'ai' || type === 'hybrid' || type === 'human') && pkg?.active !== false) totals[type] += Math.max(0, Number(pkg.minutesRemaining) || 0);
  }
  return totals;
}

export async function loadProjectStatusFacts(uid: string): Promise<string[]> {
  const snapshot = await adminDb.collection('transcriptions').where('userId', '==', uid).limit(50).get();
  const counts = { complete: 0, active: 0, pending: 0 };
  for (const document of snapshot.docs) {
    const data = document.data();
    if (data.deletionStatus === 'deleted' || data.filesDeletedAt) continue;
    const status = String(data.status || 'pending');
    if (status === 'complete' || status === 'completed') counts.complete += 1;
    else if (status.includes('progress') || status.includes('processing') || status === 'queued') counts.active += 1;
    else counts.pending += 1;
  }
  return [`Completed: ${counts.complete}`, `In progress: ${counts.active}`, `Pending review or action: ${counts.pending}`];
}

export function validateClientActions(actions: Array<{ id: HelpActionId; label: string }>, accountFacts?: AccountFacts): ClientHelpAction[] {
  return actions.map(action => {
    if (action.id === 'show_account_balances') {
      return accountFacts
        ? { id: action.id, label: actionLabels[action.id], href: '/dashboard', details: [`AI: ${accountFacts.ai} min`, `Hybrid: ${accountFacts.hybrid} min`, `Human: ${accountFacts.human} min`, `AI trial: ${accountFacts.trial} min`] }
        : { id: action.id, label: 'Sign in to view minutes', href: '/signin' };
    }
    return { id: action.id, label: actionLabels[action.id], href: actionRoutes[action.id] };
  });
}

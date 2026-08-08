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
  // AI pricing is code-controlled because membership is server-authoritative;
  // retain configurable legacy values only for unchanged Hybrid/Human services.
  const rates = { ...TRANSCRIPTION_MODE_RATES, ...configuredRates, ai: TRANSCRIPTION_MODE_RATES.ai };
  return {
    currency: 'CAD',
    services: {
      ai: { name: 'AI Transcription', ratePerAudioMinute: rates.ai, description: 'Best for transcriptionists, professional transcript editors, and experienced users. The client reviews and edits the AI-generated transcript themselves in Transcript Workspace.' },
      hybrid: { name: 'Hybrid Transcription', ratePerAudioMinute: rates.hybrid, description: 'AI-generated first, then reviewed and corrected against the original audio by a professional transcriptionist. A more affordable professionally reviewed option.' },
      human: { name: 'Human Transcription', ratePerAudioMinute: rates.human, description: 'No AI-generated transcript. A professional transcriptionist types, formats, reviews, and proofreads it from the original audio.' },
    },
    workspaces: {
      transcript: 'Self-service AI transcription and transcript editing tools. Professional Hybrid and Human Transcription are separate service options.',
      document: 'Document Preparation Services create human-prepared documents from dictation, handwriting, copy typing, instructions, or a supplied template. Projects are managed through Document Workspace.',
      separation: 'The workspaces are separate. Files and projects do not transfer between them automatically, and they do not share an editor.',
    },
    speakerRule: { threshold: 'One to four speakers are included. Recordings with more than four speakers require a custom quote.', perAudioMinute: {} },
    rushPerAudioMinute: RUSH_SURCHARGE_RATES,
    packages: 'Package eligibility depends on service type. Package minutes are reduced only by submitted audio duration. Hybrid and Human package add-ons are paid separately through secure checkout.',
    aiUse: 'AI is used only for AI Transcription and Hybrid Transcription. Human Transcription and human-only Document Preparation Services do not use AI to generate the work.',
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

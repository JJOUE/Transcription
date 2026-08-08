import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  AI_STANDARD_TRANSCRIPT_STYLE_ID,
  resolveTranscriptCapabilities,
  transcriptStyleAllowed,
} from '../src/lib/transcript-access/entitlements.ts';

const paidAiJob = { mode: 'ai', billingType: 'pay-as-you-go', paymentStatus: 'paid', freeTrialMinutesUsed: 0 };
const resolve = (job, options = {}) => resolveTranscriptCapabilities({
  job, isAdmin: false, ...options,
});

const standard = resolve(paidAiJob);
assert.equal(standard.accessLevel, 'standard', 'AI-only owner receives standard access');
assert.equal(standard.canEditTranscript, false);
assert.equal(standard.canRenameSpeakers, true);
assert.equal(standard.canChangeTimecodes, true);
assert.equal(standard.canDownload, true);
assert.deepEqual(standard.allowedTranscriptStyleIds, [AI_STANDARD_TRANSCRIPT_STYLE_ID]);
assert.equal(transcriptStyleAllowed(standard, 'speaker-own-line'), false, 'AI-only cannot select another style');
assert.equal(transcriptStyleAllowed(standard, AI_STANDARD_TRANSCRIPT_STYLE_ID), true);

const member = resolve(paidAiJob, { membershipActive: true });
assert.equal(member.accessLevel, 'full', 'active member receives full access');
assert.equal(member.canUseSearchReplace, true);
assert.equal(transcriptStyleAllowed(member, 'clean-read'), true);

assert.equal(resolve({ ...paidAiJob, billingType: 'ai-free-trial', paymentStatus: 'free-trial', freeTrialMinutesUsed: 10 }).accessLevel, 'full', 'trial job receives full access');
assert.equal(resolveTranscriptCapabilities({ job: paidAiJob, isAdmin: true }).accessLevel, 'full', 'admin receives full access');
assert.equal(resolve(paidAiJob, { membershipActive: false }).accessLevel, 'standard', 'inactive or expired member returns to standard access');
assert.equal(resolve({ mode: 'ai' }).accessLevel, 'full', 'ambiguous historical AI job preserves access');
const hybridDelivery = resolve({ mode: 'hybrid', billingType: 'package', professionalWorkflow: 'managed-delivery' });
assert.equal(hybridDelivery.accessLevel, 'professional-delivery', 'managed Hybrid work uses professional delivery access');
assert.equal(hybridDelivery.canEditTranscript, false, 'Hybrid clients do not receive the self-service editor');
assert.equal(hybridDelivery.canDownload, true, 'Hybrid clients retain completed-file downloads');
const humanDelivery = resolve({ mode: 'human', billingType: 'package', professionalWorkflow: 'managed-delivery' });
assert.equal(humanDelivery.accessLevel, 'professional-delivery', 'managed Human work uses professional delivery access');
assert.equal(humanDelivery.canEditTranscript, false, 'Human clients do not receive the self-service editor');
assert.equal(resolve({ mode: 'hybrid', billingType: 'package' }).accessLevel, 'full', 'historical Hybrid access is preserved');
assert.equal(resolve({ mode: 'human', billingType: 'package' }).accessLevel, 'full', 'historical Human access is preserved');
assert.equal(resolveTranscriptCapabilities({ job: { mode: 'hybrid', professionalWorkflow: 'managed-delivery' }, isAdmin: true }).accessLevel, 'full', 'admin retains Hybrid review tools');

const routeSource = await readFile(new URL('../src/app/api/transcriptions/[id]/transcript/route.ts', import.meta.url), 'utf8');
assert.match(routeSource, /!capabilities\.canEditTranscript/, 'content save route enforces full editing entitlement');
assert.match(routeSource, /capabilities\.canRenameSpeakers/, 'speaker rename is capability checked');
assert.match(routeSource, /capabilities\.canChangeTimecodes/, 'timecode updates are capability checked');
assert.match(routeSource, /transcriptStyleAllowed\(capabilities/, 'style updates are capability checked');

const capabilitiesRouteSource = await readFile(new URL('../src/app/api/transcriptions/[id]/capabilities/route.ts', import.meta.url), 'utf8');
assert.match(capabilitiesRouteSource, /isProfessionalEditorMembershipActive\(user\.professionalEditorMembership\)/, 'membership is resolved from the server-owned user record');

const pageSource = await readFile(new URL('../src/app/(protected)/transcript/[id]/page.tsx', import.meta.url), 'utf8');
assert.match(pageSource, /AI_STANDARD_TRANSCRIPT_STYLE_ID/, 'standard AI export style is enforced');
assert.match(pageSource, /\['docx', 'pdf', 'txt', 'srt', 'vtt'\]/, 'all download formats remain available');

console.log('Transcript entitlement tests passed.');

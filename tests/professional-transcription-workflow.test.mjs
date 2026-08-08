import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolveTranscriptCapabilities } from '../src/lib/transcript-access/entitlements.ts';
import {
  PROFESSIONAL_FINISHED_FILE_REQUIRED_MESSAGE,
  professionalCompletionCheck,
} from '../src/lib/transcription/professional-completion.ts';

const hybrid = { mode: 'hybrid', professionalWorkflow: 'managed-delivery' };
const human = { mode: 'human', professionalWorkflow: 'managed-delivery' };

assert.equal(resolveTranscriptCapabilities({ job: hybrid, isAdmin: false }).accessLevel, 'professional-delivery');
assert.equal(resolveTranscriptCapabilities({ job: human, isAdmin: false }).accessLevel, 'professional-delivery');
assert.equal(resolveTranscriptCapabilities({ job: hybrid, isAdmin: true }).accessLevel, 'full');
assert.equal(resolveTranscriptCapabilities({ job: { mode: 'hybrid' }, isAdmin: false }).accessLevel, 'full');

const managedJob = {
  serviceCategory: 'professional-transcription',
  professionalWorkflow: 'managed-delivery',
  userId: 'test-user',
  status: 'pending-review',
};
for (const mode of ['hybrid', 'human']) {
  const missingFile = professionalCompletionCheck('project-one', { ...managedJob, mode });
  assert.equal(missingFile.allowed, false, `managed ${mode} cannot complete without a finished file`);
  assert.equal(missingFile.error, PROFESSIONAL_FINISHED_FILE_REQUIRED_MESSAGE);

  const withFile = professionalCompletionCheck('project-one', {
    ...managedJob,
    mode,
    finishedTranscriptPath: 'transcriptions/test-user/project-one/finished-transcript/completed.docx',
  });
  assert.equal(withFile.allowed, true, `managed ${mode} may complete after finished-file metadata exists`);
  assert.equal(withFile.requiresStorageVerification, true);
}

assert.equal(professionalCompletionCheck('legacy', { mode: 'hybrid', status: 'pending-review' }).allowed, true, 'historical professional jobs preserve completion behavior');
assert.equal(professionalCompletionCheck('ai-job', { mode: 'ai', status: 'processing' }).allowed, true, 'AI completion behavior is unchanged');

const createRoute = await readFile(new URL('../src/app/api/transcriptions/create/route.ts', import.meta.url), 'utf8');
assert.match(createRoute, /serviceCategory: 'professional-transcription'/);
assert.match(createRoute, /professionalWorkflow: 'managed-delivery'/);
assert.match(createRoute, /aiGeneratedInitialTranscript: validatedBody\.mode === 'hybrid'/);
assert.match(createRoute, /validatedBody\.mode === 'human' \? 'pending-transcription' : 'processing'/);

const processRoute = await readFile(new URL('../src/app/api/transcriptions/process/route.ts', import.meta.url), 'utf8');
assert.match(processRoute, /authorizationJob\.mode === 'hybrid'/);
assert.match(processRoute, /startTranscriptionProcessing/);

const callbackRoute = await readFile(new URL('../src/app/api/speechmatics/callback/route.ts', import.meta.url), 'utf8');
assert.match(callbackRoute, /jobData\.mode === 'hybrid' \? 'pending-review' : 'complete'/);

const transcriptPage = await readFile(new URL('../src/app/(protected)/transcript/[id]/page.tsx', import.meta.url), 'utf8');
assert.match(transcriptPage, /shouldShowFinishedProfessionalDelivery/);
assert.match(transcriptPage, /capabilities\.accessLevel === 'professional-delivery'/);

const deliveryRoute = await readFile(new URL('../src/app/api/transcripts/[id]/finished-transcript/route.ts', import.meta.url), 'utf8');
assert.match(deliveryRoute, /job\.userId !== decodedToken\.uid && !isAdmin/);
assert.match(deliveryRoute, /expectedPrefix = `transcriptions\/\$\{job\.userId\}\/\$\{id\}\/finished-transcript\//);

const completionRoute = await readFile(new URL('../src/app/api/admin/transcriptions/[id]/complete/route.ts', import.meta.url), 'utf8');
assert.match(completionRoute, /adminSnapshot\.data\(\)\?\.role !== 'admin'/, 'completion route requires administrator access');
assert.match(completionRoute, /adminStorage\.bucket\(\)\.file\(completion\.path\)\.exists\(\)/, 'completion route verifies the finished Storage object');
assert.match(completionRoute, /status: 409/, 'early completion returns a conflict without changing status');

console.log('Professional transcription workflow tests passed.');

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, CircleHelp, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { intakeHelpContent } from '@/lib/intake/help-content';
import { clearGuidedIntakeDraft, loadGuidedIntakeDraft, saveGuidedIntakeDraft } from '@/lib/intake/session-draft';
import {
  createEmptyGuidedIntakeDraft,
  type GuidedIntakeDraft,
  type IntakeOutcome,
  type IntakeService,
} from '@/lib/intake/types';

type Step = 'outcome' | 'service' | 'files' | 'details' | 'review';

const outcomeOptions: Array<{ value: IntakeOutcome; label: string; description: string }> = [
  { value: 'transcript', label: 'Transcribe audio or video', description: 'Create a transcript from a recording.' },
  { value: 'transcript-document', label: 'Transcribe audio and prepare a finished document', description: 'Use Human transcription with a template or document instructions.' },
  { value: 'dictation-document', label: 'Prepare a document from dictation', description: 'Use audio instructions to prepare a document.' },
  { value: 'copy-typing', label: 'Type scanned or existing material', description: 'Retype a PDF, scan, image, draft, or notes into a clean document.' },
  { value: 'handwriting', label: 'Type handwritten material', description: 'Turn readable handwritten notes, scans, or photographs into a typed document.' },
  { value: 'unsure', label: 'I am not sure', description: 'We will suggest the closest standard form.' },
];

const serviceOptions: Array<{ value: IntakeService; label: string; description: string }> = [
  { value: 'ai', label: 'AI Transcription', description: 'A quick first draft for clear recordings.' },
  { value: 'hybrid', label: 'Hybrid Transcription', description: 'AI transcription followed by human review.' },
  { value: 'human', label: 'Human Transcription', description: 'Completed and reviewed by a professional transcriptionist.' },
];

function Help({ topic }: { topic: keyof typeof intakeHelpContent }) {
  const [open, setOpen] = useState(false);
  const help = intakeHelpContent[topic];
  return (
    <div className="mt-4">
      <button type="button" onClick={() => setOpen(value => !value)} className="inline-flex items-center gap-2 text-sm font-medium text-[#003366] underline underline-offset-4">
        <CircleHelp className="h-4 w-4" /> {help.label}
      </button>
      {open && <p className="mt-2 rounded-md border border-[#ddd3ed] bg-[#f7f4fb] p-3 text-sm text-gray-700">{help.text}</p>}
    </div>
  );
}

function AnswerCard({ selected, title, description, onClick }: { selected: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} className={`w-full rounded-md border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#72629e] ${selected ? 'border-[#72629e] bg-[#f3eef9]' : 'border-gray-200 bg-white hover:border-[#b29dd9]'}`}>
      <span className="flex items-start justify-between gap-4">
        <span><span className="block font-semibold text-[#003366]">{title}</span><span className="mt-1 block text-sm text-gray-600">{description}</span></span>
        {selected && <Check className="h-5 w-5 shrink-0 text-[#72629e]" />}
      </span>
    </button>
  );
}

export function GuidedProjectIntake() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [draft, setDraft] = useState<GuidedIntakeDraft>(createEmptyGuidedIntakeDraft);
  const [step, setStep] = useState<Step>('outcome');
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  useEffect(() => {
    const saved = loadGuidedIntakeDraft();
    if (saved) {
      setDraft(saved);
      setStep('review');
      return;
    }
    const preset = searchParams.get('outcome') as IntakeOutcome | null;
    if (preset && outcomeOptions.some(option => option.value === preset)) {
      setDraft(current => ({ ...current, outcome: preset, service: preset === 'transcript-document' ? 'human' : current.service }));
    }
  }, [searchParams]);

  useEffect(() => {
    saveGuidedIntakeDraft(draft);
  }, [draft]);

  const needsTranscription = draft.outcome === 'transcript' || draft.outcome === 'transcript-document';
  const needsTemplate = draft.outcome === 'transcript-document';
  const steps = useMemo<Step[]>(() => ['outcome', ...(needsTranscription || draft.outcome === 'unsure' ? ['service' as Step] : []), 'files', 'details', 'review'], [draft.outcome, needsTranscription]);
  const currentIndex = steps.indexOf(step);

  const updateDraft = (update: Partial<GuidedIntakeDraft>) => setDraft(current => ({ ...current, ...update, updatedAt: new Date().toISOString() }));
  const next = () => setStep(steps[Math.min(currentIndex + 1, steps.length - 1)]);
  const back = () => setStep(steps[Math.max(currentIndex - 1, 0)]);

  const chooseOutcome = (outcome: IntakeOutcome) => {
    updateDraft({ outcome, service: outcome === 'transcript-document' ? 'human' : draft.service });
  };

  const handleSourceFiles = (files: FileList | null) => {
    const selected = files ? Array.from(files) : [];
    setSourceFiles(selected);
    updateDraft({ selectedSourceFileNames: selected.map(file => file.name) });
  };

  const handleTemplate = (file: File | null) => {
    setTemplateFile(file);
    updateDraft({ selectedTemplateFileName: file?.name });
  };

  const standardFormPath = draft.outcome === 'transcript' ? '/upload?guided=1' : '/office/upload?guided=1';
  const continueSecurely = () => {
    saveGuidedIntakeDraft(draft);
    if (!user) {
      router.push(`/signin?next=${encodeURIComponent('/start-project?resume=1')}`);
      return;
    }
    router.push(standardFormPath);
  };

  const cancel = () => {
    clearGuidedIntakeDraft();
    setDraft(createEmptyGuidedIntakeDraft());
    setSourceFiles([]);
    setTemplateFile(null);
    setStep('outcome');
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#72629e]">Guided project intake</p>
          <p className="text-sm text-gray-600">Question {Math.max(currentIndex + 1, 1)} of {steps.length}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={() => setShowWalkthrough(true)}>Show me how it works</Button>
          <Button type="button" variant="ghost" onClick={cancel}>Exit</Button>
        </div>
      </div>

      <div className="mb-6 h-2 overflow-hidden rounded-full bg-gray-200" aria-label="Intake progress">
        <div className="h-full bg-[#72629e] transition-all" style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }} />
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6 md:p-8">
          {step === 'outcome' && (
            <div>
              <h2 className="text-2xl font-bold text-[#003366]">What would you like help with? <span className="text-sm font-normal text-red-700">Required</span></h2>
              <p className="mt-2 text-gray-600">Choose the outcome that best matches your project.</p>
              <div className="mt-6 space-y-3">
                {outcomeOptions.map(option => <AnswerCard key={option.value} selected={draft.outcome === option.value} title={option.label} description={option.description} onClick={() => chooseOutcome(option.value)} />)}
              </div>
              <Help topic="outcome" />
            </div>
          )}

          {step === 'service' && (
            <div>
              {draft.outcome === 'unsure' ? (
                <>
                  <h2 className="text-2xl font-bold text-[#003366]">What kind of source material do you have?</h2>
                  <p className="mt-2 text-gray-600">This helps us send you to the closest existing form.</p>
                  <div className="mt-6 space-y-3">
                    <AnswerCard selected={false} title="An audio or video recording" description="Continue with transcription choices." onClick={() => updateDraft({ outcome: 'transcript' })} />
                    <AnswerCard selected={false} title="A scan, PDF, image, draft, or handwritten notes" description="Continue with document typing choices." onClick={() => { updateDraft({ outcome: 'copy-typing' }); setStep('files'); }} />
                    <AnswerCard selected={false} title="I still need help choosing" description="Contact Talk to Text Canada before submitting a project." onClick={() => router.push('/contact')} />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-[#003366]">How should your recording be transcribed? <span className="text-sm font-normal text-red-700">Required</span></h2>
                  {needsTemplate && <p className="mt-2 rounded-md bg-[#f7f4fb] p-3 text-sm text-gray-700">A finished document from a transcript currently uses the Human Transcription form so a template can be included.</p>}
                  <div className="mt-6 space-y-3">
                    {serviceOptions.filter(option => !needsTemplate || option.value === 'human').map(option => <AnswerCard key={option.value} selected={draft.service === option.value} title={option.label} description={option.description} onClick={() => updateDraft({ service: option.value })} />)}
                  </div>
                  <Help topic="services" />
                </>
              )}
            </div>
          )}

          {step === 'files' && (
            <div>
              <h2 className="text-2xl font-bold text-[#003366]">Which files will you use?</h2>
              <p className="mt-2 text-gray-600">Files are selected for your review only. They are not uploaded on this public page.</p>
              <label className="mt-6 block rounded-md border border-dashed border-[#b29dd9] p-5">
                <span className="font-semibold text-[#003366]">Source file {needsTranscription ? '(required)' : '(required)'}</span>
                <Input className="mt-3" type="file" multiple={draft.outcome === 'transcript'} onChange={event => handleSourceFiles(event.target.files)} />
                <span className="mt-2 block text-sm text-gray-600">{sourceFiles.length ? `${sourceFiles.map(file => file.name).join(', ')} — Selected — not uploaded` : 'Missing and required'}</span>
              </label>
              {needsTemplate && (
                <label className="mt-4 block rounded-md border border-dashed border-[#b29dd9] p-5">
                  <span className="font-semibold text-[#003366]">Template file (optional)</span>
                  <Input className="mt-3" type="file" accept=".doc,.docx,.pdf,.txt" onChange={event => handleTemplate(event.target.files?.[0] || null)} />
                  <span className="mt-2 block text-sm text-gray-600">{templateFile ? `${templateFile.name} — Selected — not uploaded` : 'Not provided'}</span>
                </label>
              )}
              <p className="mt-4 text-sm text-amber-800">You may need to select these files again after signing in. Nothing is uploaded until the secure standard form confirms the upload.</p>
              <Help topic={needsTemplate ? 'template' : 'files'} />
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-5">
              <div><h2 className="text-2xl font-bold text-[#003366]">A few helpful details</h2><p className="mt-2 text-gray-600">These questions are optional. Skip anything you do not know.</p></div>
              {needsTranscription && (
                <>
                  <label className="block"><span className="text-sm font-medium text-gray-800">Approximate speaker count</span><Input className="mt-2" type="number" min="1" max="100" value={draft.speakerCount || ''} onChange={event => updateDraft({ speakerCount: Number(event.target.value) || undefined })} /></label>
                  <label className="flex items-center gap-3"><input type="checkbox" checked={Boolean(draft.rushRequested)} onChange={event => updateDraft({ rushRequested: event.target.checked })} /><span className="text-sm text-gray-800">Ask about rush service where supported</span></label>
                  <Help topic="speakers" />
                </>
              )}
              <label className="block"><span className="text-sm font-medium text-gray-800">Instructions or notes</span><textarea className="mt-2 min-h-28 w-full rounded-md border border-gray-300 p-3" value={draft.instructions || ''} onChange={event => updateDraft({ instructions: event.target.value })} placeholder="Names, spelling, terminology, formatting, or what you need prepared" /></label>
              {needsTemplate && <label className="block"><span className="text-sm font-medium text-gray-800">Document instructions</span><textarea className="mt-2 min-h-24 w-full rounded-md border border-gray-300 p-3" value={draft.documentInstructions || ''} onChange={event => updateDraft({ documentInstructions: event.target.value })} /></label>}
              <label className="block"><span className="text-sm font-medium text-gray-800">Requested output format</span><select className="mt-2 w-full rounded-md border border-gray-300 p-3" value={draft.requestedOutputFormat || ''} onChange={event => updateDraft({ requestedOutputFormat: event.target.value || undefined })}><option value="">Skip for now</option><option>DOCX</option><option>PDF</option><option>TXT</option></select></label>
              <label className="block"><span className="text-sm font-medium text-gray-800">Preferred filename</span><Input className="mt-2" value={draft.preferredFilename || ''} onChange={event => updateDraft({ preferredFilename: event.target.value || undefined })} /></label>
              <Help topic="instructions" />
            </div>
          )}

          {step === 'review' && (
            <div>
              <h2 className="text-2xl font-bold text-[#003366]">Review your project</h2>
              <p className="mt-2 text-gray-600">Confirm your answers before continuing to the secure standard form.</p>
              <dl className="mt-6 divide-y divide-gray-200 rounded-md border border-gray-200">
                {[
                  { label: 'Requested service', value: draft.outcome || 'Required', editStep: 'outcome' as Step },
                  { label: 'Transcription option', value: needsTranscription ? (draft.service || 'Required') : 'Not applicable', editStep: needsTranscription ? 'service' as Step : 'outcome' as Step },
                  {
                    label: 'Source files',
                    value: draft.selectedSourceFileNames?.length
                      ? `${draft.selectedSourceFileNames.join(', ')} — ${sourceFiles.length ? 'Selected — not uploaded' : 'Must be selected again'}`
                      : 'Missing and required',
                    editStep: 'files' as Step,
                  },
                  {
                    label: 'Template',
                    value: draft.selectedTemplateFileName
                      ? `${draft.selectedTemplateFileName} — ${templateFile ? 'Selected — not uploaded' : 'Must be selected again'}`
                      : 'Not provided',
                    editStep: 'files' as Step,
                  },
                  { label: 'Instructions', value: draft.instructions || draft.documentInstructions || 'Not provided', editStep: 'details' as Step },
                  { label: 'Speaker count', value: draft.speakerCount ? String(draft.speakerCount) : 'Not provided', editStep: 'details' as Step },
                  { label: 'Rush', value: draft.rushRequested ? 'Requested; availability and price confirmed in the standard form' : 'Not selected', editStep: 'details' as Step },
                  { label: 'Output format', value: draft.requestedOutputFormat || 'Not provided', editStep: 'details' as Step },
                  { label: 'Billing path', value: 'Confirmed in the secure standard form', editStep: 'review' as Step },
                ].map(item => <div key={item.label} className="grid gap-2 p-4 sm:grid-cols-[180px_1fr_auto] sm:items-start"><dt className="font-medium text-[#003366]">{item.label}</dt><dd className="break-words text-gray-700">{item.value}</dd>{item.editStep !== 'review' && <button type="button" onClick={() => setStep(item.editStep)} className="justify-self-start text-sm font-medium text-[#003366] underline underline-offset-4">Edit</button>}</div>)}
              </dl>
              <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Files selected here are not uploaded. After sign-in, reselect them in the secure form and wait for upload confirmation before submitting.</div>
              <Help topic="billing" />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button onClick={continueSecurely} className="bg-[#003366] text-white hover:bg-[#002244]">{user ? 'Continue to secure form' : 'Sign in or create an account'}<ArrowRight className="ml-2 h-4 w-4" /></Button>
                <Button asChild variant="outline"><Link href={standardFormPath}>Use the standard form instead</Link></Button>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
            <Button type="button" variant="outline" onClick={back} disabled={currentIndex <= 0}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
            <div className="flex gap-2">
              {step === 'details' && <Button type="button" variant="ghost" onClick={next}>Skip</Button>}
              {step !== 'review' && <Button type="button" onClick={next} disabled={(step === 'outcome' && !draft.outcome) || (step === 'service' && !draft.service)} className="bg-[#003366] text-white hover:bg-[#002244]">Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>}
            </div>
          </div>
        </CardContent>
      </Card>

      {showWalkthrough && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="walkthrough-title">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md bg-white p-6 shadow-xl">
            <button type="button" onClick={() => setShowWalkthrough(false)} className="absolute right-4 top-4 rounded p-2" aria-label="Close walkthrough"><X className="h-5 w-5" /></button>
            <h2 id="walkthrough-title" className="pr-10 text-2xl font-bold text-[#003366]">How it works</h2>
            <ol className="mt-5 space-y-3 text-gray-700">{['Choose what you need.', 'Select your files.', 'Answer or skip optional questions.', 'Review your project.', 'Sign in or create an account.', 'Confirm package use or payment in the secure form.', 'Submit your project.', 'Return later to download completed work.'].map((item, index) => <li key={item} className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0ebf8] font-semibold text-[#003366]">{index + 1}</span><span>{item}</span></li>)}</ol>
            <Button className="mt-6 w-full bg-[#003366] text-white" onClick={() => setShowWalkthrough(false)}>Start</Button>
          </div>
        </div>
      )}
    </div>
  );
}

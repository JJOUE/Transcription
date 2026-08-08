export type HelpTopicId = 'upload-file' | 'choose-service' | 'workspace-comparison' | 'remaining-minutes' | 'download-work' | 'transcript-editor';

export interface HelpTopic {
  id: HelpTopicId;
  label: string;
  answer: string;
  href: string;
  linkLabel: string;
}

export const HELP_TOPICS: HelpTopic[] = [
  { id: 'upload-file', label: 'How do I upload a file?', answer: 'Choose the file on the secure upload form, wait for its name and duration to appear, then review the project before submitting.', href: '/guide#uploads', linkLabel: 'View upload steps' },
  { id: 'choose-service', label: 'Which transcription service should I choose?', answer: 'Use Transcript Workspace for self-service AI transcription. AI Transcription Only includes standard review tools, while Transcript Editor Membership adds broader editing tools. Professional Transcription includes Hybrid Transcription, which starts with AI and is professionally reviewed, and Human Transcription, which is created from the original audio without an AI-generated draft.', href: '/pricing', linkLabel: 'Compare services and pricing' },
  { id: 'workspace-comparison', label: 'What is the difference between the services?', answer: 'These are separate services: Transcript Workspace is self-service AI transcription and editing; Professional Transcription includes Hybrid and Human service; and Document Preparation Services create human-prepared documents managed through Document Workspace.', href: '/guide#workspace-comparison', linkLabel: 'Compare services and workspaces' },
  { id: 'remaining-minutes', label: 'Where can I see my remaining minutes?', answer: 'Your dashboard shows package minutes and AI trial minutes separately near the top of the page.', href: '/dashboard', linkLabel: 'Open dashboard' },
  { id: 'download-work', label: 'How do I download my completed work?', answer: 'Open the completed project from your dashboard and use its protected download button. Download files before the retention date shown for the project.', href: '/guide#downloads', linkLabel: 'View download help' },
  { id: 'transcript-editor', label: 'How do I use the transcript editor?', answer: 'Open an eligible transcript from your dashboard. AI Transcription Only includes the standard transcript style and all supported download formats; broader wording-editing, formatting, and transcript-style tools require Transcript Editor Membership. The 60-minute AI trial retains full editor access. Document Workspace does not include an online document editor.', href: '/guide#transcript-workspace', linkLabel: 'View editor steps' },
];

export const HELP_FALLBACK = "I’m not able to answer that here. Please contact Talk to Text Canada for assistance.";

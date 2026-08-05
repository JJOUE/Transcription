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
  { id: 'choose-service', label: 'Which transcription service should I choose?', answer: 'AI is automatically generated and is the fastest, lowest-cost option; review the result. Hybrid starts with AI and is then reviewed by a human. Human Transcription is completed and reviewed by a person.', href: '/pricing', linkLabel: 'Compare services and pricing' },
  { id: 'workspace-comparison', label: 'What is the difference between Transcript Workspace and Document Workspace?', answer: 'Transcript Workspace creates a transcript from audio or video. Document Workspace prepares a finished document from dictation, handwriting, copy typing, instructions, or a template. They are separate services, and projects and files do not transfer between them automatically.', href: '/guide#workspace-comparison', linkLabel: 'Compare workspaces' },
  { id: 'remaining-minutes', label: 'Where can I see my remaining minutes?', answer: 'Your dashboard shows package minutes and AI trial minutes separately near the top of the page.', href: '/dashboard', linkLabel: 'Open dashboard' },
  { id: 'download-work', label: 'How do I download my completed work?', answer: 'Open the completed project from your dashboard and use its protected download button. Download files before the retention date shown for the project.', href: '/guide#downloads', linkLabel: 'View download help' },
  { id: 'transcript-editor', label: 'How do I use the transcript editor?', answer: 'Open an eligible transcript, choose Edit Transcript, make your changes, and save before leaving or downloading. Document Workspace does not include an online document editor.', href: '/guide#transcript-workspace', linkLabel: 'View editor steps' },
];

export const HELP_FALLBACK = "I’m not able to answer that here. Please contact Talk to Text Canada for assistance.";

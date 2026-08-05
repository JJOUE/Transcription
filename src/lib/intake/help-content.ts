export const intakeHelpContent = {
  outcome: {
    label: 'What does this mean?',
    text: 'Choose the result you want. You can change your answer before continuing to the secure form.',
  },
  files: {
    label: 'How do I do this?',
    text: 'Choose a file from your phone or computer. It is only selected for this review and uploads securely after you sign in and continue to the standard form.',
  },
  template: {
    label: 'What is a template?',
    text: 'A template is a Word document or form you want us to use for the finished document. If you do not have one, skip this question.',
  },
  services: {
    label: 'Compare the options',
    text: 'AI creates a quick first draft. Hybrid uses AI first and then human review. Human transcription is completed and reviewed by a professional transcriptionist.',
  },
  speakers: {
    label: 'How do I count speakers?',
    text: 'Count each different person who speaks. Recordings with one to four speakers have no speaker surcharge.',
  },
  instructions: {
    label: 'Show me an example',
    text: 'Include names, spelling, terminology, formatting preferences, or a short explanation of the document you need.',
  },
  billing: {
    label: 'How will payment work?',
    text: 'The secure form will show the applicable package-minute or pay-as-you-go path before submission. Package minutes are reduced by the submitted audio duration.',
  },
} as const;

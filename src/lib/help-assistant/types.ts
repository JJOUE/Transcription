import { z } from 'zod';

export const helpActionIds = [
  'show_service_comparison', 'show_workspace_comparison', 'recommend_service',
  'open_transcript_upload', 'open_document_upload', 'open_pricing_page',
  'open_guide_section', 'open_contact_page', 'show_account_balances',
  'show_project_status', 'escalate_to_support',
] as const;

export type HelpActionId = typeof helpActionIds[number];

export const assistantOutputSchema = z.object({
  reply: z.string().min(1).max(1200),
  suggestions: z.array(z.string().min(1).max(100)).max(3),
  actions: z.array(z.object({ id: z.enum(helpActionIds), label: z.string().min(1).max(80) })).max(3),
});

export type AssistantOutput = z.infer<typeof assistantOutputSchema>;
export interface ClientHelpAction { id: HelpActionId; label: string; href?: string; details?: string[] }
export interface HelpChatMessage { role: 'user' | 'assistant'; content: string }

type HelpEventName =
  | 'help_assistant_opened'
  | 'help_topic_selected'
  | 'help_full_guide_opened'
  | 'help_contact_support_selected'
  | 'ai_help_assistant_opened'
  | 'ai_help_question_submitted'
  | 'ai_help_service_recommended'
  | 'ai_help_workspace_recommended'
  | 'ai_help_action_selected'
  | 'ai_help_support_escalated'
  | 'ai_help_api_failed'
  | 'ai_help_rate_limited';

export function trackHelpEvent(eventName: HelpEventName, topicId?: string) {
  if (typeof window === 'undefined') return;
  const analyticsWindow = window as Window & { gtag?: (command: 'event', name: string, parameters?: Record<string, string>) => void };
  analyticsWindow.gtag?.('event', eventName, topicId ? { help_topic: topicId } : undefined);
}

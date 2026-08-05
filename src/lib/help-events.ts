type HelpEventName = 'help_assistant_opened' | 'help_topic_selected' | 'help_full_guide_opened' | 'help_contact_support_selected';

export function trackHelpEvent(eventName: HelpEventName, topicId?: string) {
  if (typeof window === 'undefined') return;
  const analyticsWindow = window as Window & { gtag?: (command: 'event', name: string, parameters?: Record<string, string>) => void };
  analyticsWindow.gtag?.('event', eventName, topicId ? { help_topic: topicId } : undefined);
}

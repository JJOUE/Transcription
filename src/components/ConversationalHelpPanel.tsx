'use client';

import Link from 'next/link';
import { FormEvent, useRef, useState } from 'react';
import { LoaderCircle, RotateCcw, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { HELP_FALLBACK, HELP_TOPICS } from '@/lib/help-topics';
import { trackHelpEvent } from '@/lib/help-events';
import type { ClientHelpAction, HelpChatMessage } from '@/lib/help-assistant/types';

interface DisplayMessage extends HelpChatMessage {
  actions?: ClientHelpAction[];
}

const welcomeMessage: DisplayMessage = { role: 'assistant', content: 'Hi! What can I help you with?' };
const apiFallback = 'I’m having trouble answering right now. You can use one of the help topics below or contact Talk to Text Canada.';

export function ConversationalHelpPanel() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DisplayMessage[]>([welcomeMessage]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFallbackTopics, setShowFallbackTopics] = useState(true);
  const messageListRef = useRef<HTMLDivElement>(null);

  const scrollToLatest = () => window.requestAnimationFrame(() => {
    if (messageListRef.current) messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  });

  const chooseTopic = (topic: typeof HELP_TOPICS[number]) => {
    setMessages(current => [...current, { role: 'user', content: topic.label }, { role: 'assistant', content: topic.answer, actions: [{ id: topic.id === 'workspace-comparison' ? 'show_workspace_comparison' : topic.id === 'choose-service' ? 'show_service_comparison' : 'open_guide_section', label: topic.linkLabel, href: topic.href }] }]);
    setShowFallbackTopics(false);
    setSuggestions([]);
    trackHelpEvent('help_topic_selected', topic.id);
    scrollToLatest();
  };

  const sendQuestion = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (messages.length >= 10) {
      setMessages(current => [...current, { role: 'assistant', content: 'Please choose Start over to begin a new help conversation.' }]);
      setShowFallbackTopics(true);
      scrollToLatest();
      return;
    }
    const userMessage: DisplayMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage].slice(-10);
    setMessages(nextMessages);
    setQuestion('');
    setSuggestions([]);
    setShowFallbackTopics(false);
    setLoading(true);
    trackHelpEvent('ai_help_question_submitted');
    scrollToLatest();

    try {
      const token = user ? await user.getIdToken() : null;
      const response = await fetch('/api/help-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ messages: nextMessages.map(({ role, content }) => ({ role, content })) }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        if (response.status === 429) trackHelpEvent('ai_help_rate_limited');
        else trackHelpEvent('ai_help_api_failed');
        throw new Error(typeof result.fallback === 'string' ? result.fallback : apiFallback);
      }
      const actions = Array.isArray(result.actions) ? result.actions as ClientHelpAction[] : [];
      setMessages(current => [...current, { role: 'assistant', content: result.reply, actions }]);
      setSuggestions(Array.isArray(result.suggestions) ? result.suggestions.slice(0, 3) : []);
      setShowFallbackTopics(false);
      if (actions.some(action => action.id === 'recommend_service' || action.id === 'show_service_comparison')) trackHelpEvent('ai_help_service_recommended');
      if (actions.some(action => action.id === 'show_workspace_comparison')) trackHelpEvent('ai_help_workspace_recommended');
    } catch (error) {
      setMessages(current => [...current, { role: 'assistant', content: error instanceof Error ? error.message : apiFallback }]);
      setShowFallbackTopics(true);
    } finally {
      setLoading(false);
      scrollToLatest();
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void sendQuestion(question);
  };

  const startOver = () => {
    setMessages([welcomeMessage]);
    setQuestion('');
    setSuggestions([]);
    setShowFallbackTopics(true);
  };

  const trackAction = (action: ClientHelpAction) => {
    trackHelpEvent('ai_help_action_selected', action.id);
    if (action.id === 'escalate_to_support') trackHelpEvent('ai_help_support_escalated');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={messageListRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite" aria-busy={loading}>
        <p className="rounded-md border border-[#ddd3ed] bg-[#f7f4fb] p-3 text-xs leading-5 text-gray-700">Your typed help questions are sent to OpenAI for automated processing. Identifying details are removed where detected. Talk to Text Canada does not save the conversation, but OpenAI may temporarily retain API data under its data-retention policies. Do not enter transcript text, document text, or private project information.</p>
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'ml-8' : 'mr-8'}>
            <div className={`rounded-md px-3 py-2 text-sm leading-6 ${message.role === 'user' ? 'bg-[#003366] text-white' : 'bg-gray-100 text-gray-800'}`}>{message.content}</div>
            {message.actions?.map(action => (
              <div key={`${action.id}-${action.label}`} className="mt-2 rounded-md border border-[#cfc2e6] bg-white p-2">
                {action.details?.map(detail => <p key={detail} className="text-xs text-gray-700">{detail}</p>)}
                {action.href && <Link href={action.href} onClick={() => trackAction(action)} className="mt-1 inline-flex min-h-10 items-center text-sm font-semibold text-[#003366] underline underline-offset-4">{action.label}</Link>}
              </div>
            ))}
          </div>
        ))}
        {loading && <div className="mr-8 flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-700"><LoaderCircle className="h-4 w-4 animate-spin" /> Thinking...</div>}
        {suggestions.length > 0 && <div className="space-y-2">{suggestions.map(suggestion => <button key={suggestion} type="button" onClick={() => void sendQuestion(suggestion)} className="min-h-10 w-full rounded-md border border-[#cfc2e6] px-3 py-2 text-left text-sm text-[#003366] hover:bg-[#f7f4fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]">{suggestion}</button>)}</div>}
        {showFallbackTopics && <div className="space-y-2"><p className="text-xs font-semibold uppercase text-gray-500">Quick help topics</p>{HELP_TOPICS.map(topic => <button key={topic.id} type="button" onClick={() => chooseTopic(topic)} className="min-h-11 w-full rounded-md border border-gray-200 px-3 py-2 text-left text-sm font-medium text-[#003366] hover:border-[#b29dd9] hover:bg-[#f7f4fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]">{topic.label}</button>)}</div>}
        <div className="flex gap-2 pt-2">
          <Link href="/guide" onClick={() => trackHelpEvent('help_full_guide_opened')} className="flex min-h-10 flex-1 items-center justify-center rounded-md border border-[#003366] px-3 py-2 text-center text-xs font-semibold text-[#003366]">Help &amp; Guide</Link>
          <Link href="/contact" onClick={() => trackHelpEvent('help_contact_support_selected')} className="flex min-h-10 flex-1 items-center justify-center rounded-md bg-[#003366] px-3 py-2 text-center text-xs font-semibold text-white">Contact support</Link>
        </div>
        <p className="text-xs leading-5 text-gray-500">{HELP_FALLBACK}</p>
      </div>
      <div className="border-t border-gray-200 bg-white p-3">
        <form onSubmit={submit} className="flex items-end gap-2">
          <label htmlFor="help-question" className="sr-only">Ask Talk to Text Help a question</label>
          <textarea id="help-question" rows={2} maxLength={600} value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (question.trim()) void sendQuestion(question); } }} placeholder="Ask about services, uploads, or workspaces" className="min-h-12 flex-1 resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]" disabled={loading} />
          <button type="submit" disabled={loading || !question.trim()} className="flex h-12 w-12 items-center justify-center rounded-md bg-[#003366] text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b29dd9]" aria-label="Send question"><Send className="h-5 w-5" /></button>
        </form>
        <button type="button" onClick={startOver} className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-[#003366] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]"><RotateCcw className="h-3.5 w-3.5" /> Start over</button>
      </div>
    </div>
  );
}

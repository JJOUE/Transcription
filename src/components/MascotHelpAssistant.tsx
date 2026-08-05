'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, MessageCircle, X } from 'lucide-react';
import { HELP_FALLBACK, HELP_TOPICS, type HelpTopic } from '@/lib/help-topics';
import { trackHelpEvent } from '@/lib/help-events';

const exactRoutes = new Set(['/', '/start-project', '/pricing', '/dashboard', '/upload', '/office/upload', '/billing', '/transcriptions']);
const isSupportedRoute = (pathname: string) => exactRoutes.has(pathname) || pathname.startsWith('/transcript/') || pathname.startsWith('/document-workspace/');

export function MascotHelpAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeAssistant = () => {
    setOpen(false);
    setSelectedTopic(null);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => { if (open) closeButtonRef.current?.focus(); }, [open]);
  useEffect(() => { setOpen(false); setSelectedTopic(null); }, [pathname]);
  if (!isSupportedRoute(pathname)) return null;

  return (
    <>
      {!open && (
        <button ref={triggerRef} type="button" onClick={() => { setOpen(true); trackHelpEvent('help_assistant_opened'); }} className="fixed bottom-4 right-4 z-[30] flex min-h-12 items-center gap-2 rounded-full border border-[#cfc2e6] bg-white px-3 py-2 text-sm font-semibold text-[#003366] shadow-lg transition hover:bg-[#f7f4fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366] focus-visible:ring-offset-2 sm:bottom-6 sm:right-6" aria-label="Open Talk to Text help">
          <Image src="/mascot.png" alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
          <span className="hidden sm:inline">Need help?</span>
        </button>
      )}
      {open && (
        <section role="dialog" aria-modal="false" aria-labelledby="talk-to-text-help-title" onKeyDown={(event) => { if (event.key === 'Escape') closeAssistant(); }} className="fixed inset-x-0 bottom-0 z-[45] flex max-h-[78vh] flex-col rounded-t-lg border border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[390px] sm:rounded-lg">
          <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <Image src="/mascot.png" alt="Talk to Text Canada mascot" width={42} height={42} className="h-10 w-10 rounded-full object-cover" />
              <div><h2 id="talk-to-text-help-title" className="font-semibold text-[#003366]">Talk to Text Help</h2><p className="text-xs text-gray-600">Approved help for common questions</p></div>
            </div>
            <button ref={closeButtonRef} type="button" onClick={closeAssistant} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]" aria-label="Close Talk to Text help"><X className="h-5 w-5" /></button>
          </header>
          <div className="overflow-y-auto p-4">
            {selectedTopic ? (
              <div>
                <button type="button" onClick={() => setSelectedTopic(null)} className="mb-4 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-[#003366] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]"><ChevronLeft className="h-4 w-4" /> All help topics</button>
                <div className="rounded-md bg-[#f7f4fb] p-4"><p className="font-semibold text-[#003366]">{selectedTopic.label}</p><p className="mt-2 text-sm leading-6 text-gray-700">{selectedTopic.answer}</p><Link href={selectedTopic.href} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-[#003366] underline underline-offset-4">{selectedTopic.linkLabel}</Link></div>
              </div>
            ) : (
              <>
                <div className="mb-4 flex gap-3"><MessageCircle className="mt-1 h-5 w-5 flex-shrink-0 text-[#b29dd9]" /><p className="rounded-md bg-gray-100 px-3 py-2 text-sm text-gray-800">Hi! What can I help you with?</p></div>
                <div className="space-y-2">
                  {HELP_TOPICS.map(topic => <button key={topic.id} type="button" onClick={() => { setSelectedTopic(topic); trackHelpEvent('help_topic_selected', topic.id); }} className="w-full min-h-11 rounded-md border border-gray-200 px-3 py-2 text-left text-sm font-medium text-[#003366] hover:border-[#b29dd9] hover:bg-[#f7f4fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]">{topic.label}</button>)}
                  <Link href="/guide" onClick={() => trackHelpEvent('help_full_guide_opened')} className="flex min-h-11 w-full items-center gap-2 rounded-md border border-[#003366] px-3 py-2 text-sm font-semibold text-[#003366] hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]"><BookOpen className="h-4 w-4" /> Open the full Help &amp; Guide</Link>
                  <Link href="/contact" onClick={() => trackHelpEvent('help_contact_support_selected')} className="flex min-h-11 w-full items-center gap-2 rounded-md bg-[#003366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#00264d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b29dd9]"><MessageCircle className="h-4 w-4" /> Contact support</Link>
                </div>
                <p className="mt-4 text-xs leading-5 text-gray-500">{HELP_FALLBACK}</p>
              </>
            )}
          </div>
        </section>
      )}
    </>
  );
}

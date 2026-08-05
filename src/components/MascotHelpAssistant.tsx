'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { trackHelpEvent } from '@/lib/help-events';
import { ConversationalHelpPanel } from '@/components/ConversationalHelpPanel';

const exactRoutes = new Set(['/', '/pricing', '/dashboard', '/upload', '/office/upload', '/billing', '/transcriptions']);
const isSupportedRoute = (pathname: string) => exactRoutes.has(pathname) || pathname.startsWith('/transcript/') || pathname.startsWith('/document-workspace/');

export function MascotHelpAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeAssistant = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => { if (open) closeButtonRef.current?.focus(); }, [open]);
  useEffect(() => { setOpen(false); }, [pathname]);
  if (!isSupportedRoute(pathname)) return null;

  return (
    <>
      {!open && (
        <button ref={triggerRef} type="button" onClick={() => { setOpen(true); trackHelpEvent('help_assistant_opened'); trackHelpEvent('ai_help_assistant_opened'); }} className="fixed bottom-4 right-4 z-[30] flex min-h-12 items-center gap-2 rounded-full border border-[#cfc2e6] bg-white px-3 py-2 text-sm font-semibold text-[#003366] shadow-lg transition hover:bg-[#f7f4fb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366] focus-visible:ring-offset-2 sm:bottom-6 sm:right-6" aria-label="Open Talk to Text help">
          <Image src="/mascot.png" alt="" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
          <span className="hidden sm:inline">Need help?</span>
        </button>
      )}
      {open && (
        <section role="dialog" aria-modal="false" aria-labelledby="talk-to-text-help-title" onKeyDown={(event) => { if (event.key === 'Escape') closeAssistant(); }} className="fixed inset-x-0 bottom-0 z-[45] flex h-[78vh] max-h-[720px] flex-col rounded-t-lg border border-gray-200 bg-white shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:h-[640px] sm:w-[410px] sm:rounded-lg">
          <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <Image src="/mascot.png" alt="Talk to Text Canada mascot" width={42} height={42} className="h-10 w-10 rounded-full object-cover" />
              <div><h2 id="talk-to-text-help-title" className="font-semibold text-[#003366]">Talk to Text Help</h2><p className="text-xs text-gray-600">Automated service guidance</p></div>
            </div>
            <button ref={closeButtonRef} type="button" onClick={closeAssistant} className="flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#003366]" aria-label="Close Talk to Text help"><X className="h-5 w-5" /></button>
          </header>
          <ConversationalHelpPanel />
        </section>
      )}
    </>
  );
}

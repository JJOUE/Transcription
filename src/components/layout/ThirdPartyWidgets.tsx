'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { WIDGET_CONFIG, shouldLoadWidgets } from '@/config/widgets';

/**
 * Conditionally loads third-party widgets based on route
 * Widgets are excluded from auth pages to prevent overlay issues
 */
export function ThirdPartyWidgets() {
  const pathname = usePathname();

  // Don't load widgets on excluded routes (signin, signup, etc.)
  if (!shouldLoadWidgets(pathname)) {
    return null;
  }

  return (
    <>
      {/* Webchat widget (right side) */}
      {WIDGET_CONFIG.webchat.enabled && (
        <Script
          src={WIDGET_CONFIG.webchat.src}
          data-widget-id={WIDGET_CONFIG.webchat.widgetId}
          strategy="lazyOnload"
        />
      )}

      {/* AudioEye accessibility widget (left side) */}
      {WIDGET_CONFIG.audioeye.enabled && (
        <Script
          id="audioeye-loader"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `!function(){var b=function(){window.__AudioEyeSiteHash="${WIDGET_CONFIG.audioeye.siteHash}";var a=document.createElement("script");a.src="https://wsmcdn.audioeye.com/aem.js";a.type="text/javascript";a.setAttribute("async","");document.getElementsByTagName("body")[0].appendChild(a)};"complete"!==document.readyState?window.addEventListener?window.addEventListener("load",b):window.attachEvent&&window.attachEvent("onload",b):b()}();`,
          }}
        />
      )}
    </>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { validateProductionEnvironment, logValidationResults } from "@/lib/config/production-validation";
import GoogleAnalytics from "@/components/GoogleAnalytics";

// Run production validation on server startup
if (typeof window === 'undefined') {
  const validationResult = validateProductionEnvironment();
  logValidationResults(validationResult);
}

export const metadata: Metadata = {
  title: "Talk to Text Canada",
  description: "Canadian transcription and document preparation services, including AI, hybrid, and human transcription, copy typing, handwriting transcription, and secure document support.",
  metadataBase: new URL('https://www.talktotext.ca'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Talk to Text Canada",
    description: "Canadian transcription and document preparation services, including AI, hybrid, and human transcription, copy typing, handwriting transcription, and secure document support.",
    url: 'https://www.talktotext.ca',
    siteName: 'Talk to Text Canada',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <GoogleAnalytics GA_MEASUREMENT_ID={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID} />
        )}
        <ClientWrapper>{children}</ClientWrapper>
        <SpeedInsights />
      </body>
    </html>
  );
}

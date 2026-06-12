import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-4">
            Talk to Text Canada – Terms of Service
          </h1>
          <p className="text-gray-600 mb-8">
            <strong>Effective Date:</strong> July 28, 2025
          </p>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              1. Definitions
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li><strong>&quot;Services&quot;</strong> means transcription, audio instructions for document preparation, copy typing, handwriting transcription, formatting, document preparation, and related account features.</li>
              <li><strong>&quot;Client Content&quot;</strong> means all audio, video, notes, scanned documents, handwritten pages, typed drafts, templates, transcripts, and data you upload.</li>
              <li><strong>&quot;Dashboard&quot;</strong> means your secure online account area.</li>
              <li><strong>&quot;User&quot;</strong> means any person or entity accessing or using the Services.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              2. Acceptance of Terms
            </h2>
            <p className="text-gray-700 mb-6">
              By accessing or using our Services, you agree to be bound by this Terms of Service. If you do not agree, do not use the Services.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              3. Eligibility & Account Registration
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>You must be at least 18 years old and capable of forming a binding contract.</li>
              <li>You&apos;re responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You are fully responsible for all activity under your account.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              4. Services Provided
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>AI Transcription (automated, temporary US-based processing)</li>
              <li>Human Transcription (conducted entirely in Canada)</li>
              <li>Hybrid Transcription (AI plus human review)</li>
              <li>Document preparation from audio instructions, copy typing, handwriting transcription, and formatting support</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              5. Payment & Refund
            </h2>
            <p className="text-gray-700 mb-4">
              All fees are billed through Stripe. Subscriptions renew monthly until cancelled. You may cancel at any time; access remains until the end of the billing cycle.
            </p>
            <p className="text-gray-700 mb-6">
              Refunds are evaluated case by case. Partial or pro-rated refunds may be granted at our discretion. Late payments may result in service suspension and collection fees.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              6. Intellectual Property
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>You retain all rights to your Client Content and resulting transcripts.</li>
              <li>We retain all rights to the platform, software, and related IP.</li>
              <li>We grant you a limited, non-exclusive license to use the Services as intended.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              7. Confidentiality & Data Handling
            </h2>
            <p className="text-gray-700 mb-6">
              All Client Content is subject to our Confidentiality Agreement. Documents are stored securely in Canada; AI processing by Speechmatics is covered under its deletion policy.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              8. Acceptable Use
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>You agree not to upload unlawful, infringing, or harmful content.</li>
              <li>We may suspend or terminate accounts that misuse the Services.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              9. Indemnification
            </h2>
            <p className="text-gray-700 mb-6">
              You agree to indemnify and hold Talk to Text Canada harmless from any claims, damages, or losses arising from your use of the Services or your Client Content.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              10. Limitation of Liability
            </h2>
            <p className="text-gray-700 mb-6">
              To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages, including transcription inaccuracies or data loss. Your use of the Services is at your own risk.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              11. Termination & Suspension
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>We may suspend or terminate your access for breach of these terms or unlawful conduct.</li>
              <li>Upon termination, you may export your data within 30 days; thereafter we may delete it.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              12. File Retention and Client Downloads
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>Files remain active in your dashboard for 30 days after completion. After 30 days, files may be archived.</li>
              <li>Archived files remain available until the 90-day retention period ends.</li>
              <li>After 90 days, audio files, transcript files, completed documents, and related downloads may be permanently deleted unless a retention hold has been applied.</li>
              <li>You are responsible for downloading completed work before the deletion date shown in your dashboard.</li>
              <li>Retention holds may be applied at Talk to Text Canada&apos;s discretion. Deletion may be permanent, and we cannot guarantee that files can be recovered after deletion.</li>
              <li>Where available, dashboard notices may show upcoming archive and deletion dates. Email reminders may be added in the future.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              13. Governing Law & Dispute Resolution
            </h2>
            <p className="text-gray-700 mb-6">
              This Agreement is governed by the laws of Ontario and Canada. The courts of Brampton, Ontario have exclusive jurisdiction over any disputes.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              14. Modification of Terms
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>We may update these terms at any time. We&apos;ll post the revised version with a new effective date and notify registered users.</li>
              <li>Continued use after changes constitutes acceptance of the new terms.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4">
              15. Miscellaneous
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li><strong>Entire Agreement:</strong> These terms constitute the entire agreement between you and Talk to Text Canada regarding the Services.</li>
              <li><strong>Severability:</strong> If any provision is held invalid, the remainder will remain in full force.</li>
            </ul>
          </div>

          <footer className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              Contact: <a href="mailto:info@talktotext.ca" className="text-[#003366] hover:underline">info@talktotext.ca</a> | Brampton, Ontario<br />
              Last Updated: July 28, 2025
            </p>
          </footer>
        </div>
      </main>

      <Footer />
    </div>
  );
}

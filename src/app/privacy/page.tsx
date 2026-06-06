import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-8">
            Privacy Policy
          </h1>

          {/* Plain-language summary */}
          <div className="bg-[#e9e1f2] border-l-4 border-[#b094c5] rounded-lg p-6 mb-8">
            <p className="text-gray-700">
              <strong>Plain-language summary:</strong> We host primary systems and storage in Canada.
              If you choose AI-assisted transcription, audio/text may be processed by a vetted provider
              that can operate outside Canada. You control that choice. We encrypt data, minimize retention,
              and honour your PIPEDA rights.
            </p>
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4 border-l-[6px] border-[#b094c5] pl-4">
              Who we are
            </h2>
            <p className="text-gray-700 mb-6">
              Talk to Text Canada ("we", "us") provides transcription and document services to clients
              in Canada. This policy explains how we collect, use, disclose, store, and protect personal
              information under Canada's Personal Information Protection and Electronic Documents Act
              (PIPEDA) and applicable provincial laws.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4 border-l-[6px] border-[#b094c5] pl-4">
              What we collect
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>Account details: name, email, organization, billing information.</li>
              <li>Content you upload: audio/video, transcripts, notes, templates, form responses.</li>
              <li>Usage data: activity in the client portal, logs for security and support.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4 border-l-[6px] border-[#b094c5] pl-4">
              Your choices: Canada-only vs AI-assisted
            </h2>
            <p className="text-gray-700 mb-4">
              You can select the processing path for each job:
            </p>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>
                <strong>Canada-only Human Transcription:</strong> Processing and storage occur in Canada.
                No cross-border processing.
              </li>
              <li>
                <strong>AI-assisted Transcription:</strong> We use a vetted speech-to-text provider to
                speed up transcription. Processing may occur outside Canada. We apply encryption in transit
                and at rest, strict access controls, and contractual data-protection terms.
              </li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4 border-l-[6px] border-[#b094c5] pl-4">
              Purposes of use
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>To provide and improve transcription and document services you request.</li>
              <li>To secure our systems, prevent fraud, and support clients.</li>
              <li>To meet legal, accounting, and regulatory obligations.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4 border-l-[6px] border-[#b094c5] pl-4">
              Legal basis and consent
            </h2>
            <p className="text-gray-700 mb-6">
              We rely on your consent to process personal information for service delivery. You can
              withdraw consent, subject to legal/contractual limits. We use checkboxes and clear
              notices on upload pages to capture your choice of processing path.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4 border-l-[6px] border-[#b094c5] pl-4">
              Data hosting and transfers
            </h2>
            <p className="text-gray-700 mb-6">
              Primary hosting and storage are in Canada. If you select AI-assisted transcription,
              your content may be processed by a trusted subprocessor operating data centres outside
              Canada. Transfers occur only to provide the service you request.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4 border-l-[6px] border-[#b094c5] pl-4">
              File Retention and Deletion
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>Completed files remain active in your dashboard for 30 days after completion.</li>
              <li>After 30 days, files may be archived. Archived files remain available until the 90-day retention period ends.</li>
              <li>After 90 days, audio files, transcript files, completed documents, and related downloads may be permanently deleted unless a retention hold has been applied.</li>
              <li>Where available, dashboard notices may show archive and deletion dates. Email reminders may be added in the future.</li>
              <li>Some metadata may be retained for business, billing, legal, security, or audit purposes.</li>
              <li>Client dictionary terms are not automatically deleted by file retention unless separately requested or required.</li>
              <li>You can request deletion at any time; we will act within 30 days unless law requires a different period.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4 border-l-[6px] border-[#b094c5] pl-4">
              Security
            </h2>
            <p className="text-gray-700 mb-6">
              Encryption in transit and at rest, least-privilege access, audit logging, and
              employee/contractor confidentiality agreements. We regularly review security controls
              and vendor DPAs.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4 border-l-[6px] border-[#b094c5] pl-4">
              Your rights
            </h2>
            <ul className="list-disc pl-6 mb-6 text-gray-700 space-y-2">
              <li>Access and correction of your personal information.</li>
              <li>Portability (machine-readable copy on request).</li>
              <li>Deletion and withdrawal of consent.</li>
              <li>Complaint: you may contact us or the Office of the Privacy Commissioner of Canada.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4 border-l-[6px] border-[#b094c5] pl-4">
              Children
            </h2>
            <p className="text-gray-700 mb-6">
              Our services are for professional use. If you believe a child's data was provided,
              contact us to remove it.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4 border-l-[6px] border-[#b094c5] pl-4">
              Contact
            </h2>
            <p className="text-gray-700 mb-6">
              Email: <a href="mailto:privacy@talktotext.ca" className="text-[#003366] hover:underline">privacy@talktotext.ca</a><br />
              Mailing address available on request.
            </p>

            <h2 className="text-2xl font-semibold text-[#003366] mt-8 mb-4 border-l-[6px] border-[#b094c5] pl-4">
              Changes
            </h2>
            <p className="text-gray-700 mb-6">
              We will post updates to this page and modify the "Last updated" date.
            </p>
          </div>

          <footer className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-center text-sm text-gray-500">
              Last Updated: October 8, 2025
            </p>
          </footer>
        </div>
      </main>

      <Footer />
    </div>
  );
}

import React from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function LegalIntakePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-4">
            Document Workspace — Intake
          </h1>
          <p className="text-gray-600 mb-8">
            Tell us what you need prepared. You can provide instructions, templates, reference files, and document details. You&apos;ll upload audio or supporting files after this step.
          </p>

          <form>
            {/* BASICS */}
            <fieldset className="border border-dashed border-gray-300 rounded-lg p-6 mb-6">
              <legend className="font-bold text-[#003366] px-2">Basics</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="project_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Project / Case Title *
                  </label>
                  <input
                    id="project_name"
                    name="project_name"
                    type="text"
                    placeholder="e.g., Smith v. Jones – Discovery"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="turnaround" className="block text-sm font-medium text-gray-700 mb-2">
                    Turnaround
                  </label>
                  <select
                    id="turnaround"
                    name="turnaround"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                  >
                    <option>Standard (3–5 business days)</option>
                    <option>Rush (24–48 hours)</option>
                    <option>Same Day</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-2">
                    Requested Due Date
                  </label>
                  <input
                    id="due_date"
                    name="due_date"
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                  />
                </div>
              </div>
            </fieldset>

            {/* WHAT TO PRODUCE */}
            <fieldset className="border border-dashed border-gray-300 rounded-lg p-6 mb-6">
              <legend className="font-bold text-[#003366] px-2">What do you need us to produce?</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="document_type" className="block text-sm font-medium text-gray-700 mb-2">
                    Document Type *
                  </label>
                  <select
                    id="document_type"
                    name="document_type"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                  >
                    <option value="">— Select —</option>
                    <option value="court_style_doc">Court‑style document</option>
                    <option value="letter">Letter (demand/cover/counsel)</option>
                    <option value="affidavit">Affidavit / Declaration</option>
                    <option value="case_note">Case notes / interview summary</option>
                    <option value="memo">Memo / chronology / brief</option>
                    <option value="transcript_legal">Transcript (legal formatting)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Style
                  </label>
                  <select
                    id="style"
                    name="style"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                  >
                    <option value="intelligent">Intelligent Verbatim (cleaned)</option>
                    <option value="strict">Strict Verbatim (word‑for‑word)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
                    Key Details / Instructions
                  </label>
                  <textarea
                    id="instructions"
                    name="instructions"
                    placeholder="Sections, headings, tone, citations, exhibits, signature blocks, spacing, margins…"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none resize-none"
                  />
                </div>
              </div>
            </fieldset>

            {/* BRANDING / CAPTION / LETTER DETAILS */}
            <fieldset className="border border-dashed border-gray-300 rounded-lg p-6 mb-6">
              <legend className="font-bold text-[#003366] px-2">Branding / Caption / Letter Details</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="letterhead" className="block text-sm font-medium text-gray-700 mb-2">
                    Letterhead / Branding
                  </label>
                  <select
                    id="letterhead"
                    name="letterhead"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                  >
                    <option value="use_firm_defaults">Use my firm defaults on file</option>
                    <option value="none">No letterhead</option>
                    <option value="custom">I&apos;ll specify below</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="branding_notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Branding / Caption / Address Block Notes
                  </label>
                  <textarea
                    id="branding_notes"
                    name="branding_notes"
                    placeholder="Firm name & address block, signatory, commissioner details; caption lines if relevant."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none resize-none"
                  />
                </div>
              </div>
            </fieldset>

            {/* VOCAB & PRIVACY */}
            <fieldset className="border border-dashed border-gray-300 rounded-lg p-6 mb-6">
              <legend className="font-bold text-[#003366] px-2">Vocabulary & Privacy</legend>
              <div className="space-y-4">
                <div>
                  <label htmlFor="vocabulary" className="block text-sm font-medium text-gray-700 mb-2">
                    Names / Spellings / Acronyms (comma‑separated)
                  </label>
                  <input
                    id="vocabulary"
                    name="vocabulary"
                    type="text"
                    placeholder="Cassels, voir dire, Manulife, WSIB, FNHA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <input id="deidentify" type="checkbox" className="h-4 w-4 text-[#003366] border-gray-300 rounded focus:ring-[#b29dd9]" />
                  <label htmlFor="deidentify" className="text-sm font-medium text-gray-700">De‑identify personal data</label>
                </div>
                <div className="flex items-center gap-3">
                  <input id="mask_profanity" type="checkbox" className="h-4 w-4 text-[#003366] border-gray-300 rounded focus:ring-[#b29dd9]" />
                  <label htmlFor="mask_profanity" className="text-sm font-medium text-gray-700">Mask profanity</label>
                </div>
                <div className="flex items-center gap-3">
                  <input id="tracked_changes" type="checkbox" className="h-4 w-4 text-[#003366] border-gray-300 rounded focus:ring-[#b29dd9]" />
                  <label htmlFor="tracked_changes" className="text-sm font-medium text-gray-700">Deliver with Tracked Changes copy</label>
                </div>
              </div>
            </fieldset>

            {/* OPTIONAL UPLOADS */}
            <fieldset className="border border-dashed border-gray-300 rounded-lg p-6 mb-6">
              <legend className="font-bold text-[#003366] px-2">Optional Uploads</legend>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="client_template" className="block text-sm font-medium text-gray-700 mb-2">
                    Upload your firm template (DOCX)
                  </label>
                  <input
                    id="client_template"
                    name="client_template"
                    type="file"
                    accept=".docx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="reference_files" className="block text-sm font-medium text-gray-700 mb-2">
                    Reference documents (multiple)
                  </label>
                  <input
                    id="reference_files"
                    name="reference_files"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.rtf"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                  />
                </div>
              </div>
            </fieldset>

            {/* TRANSCRIPT OPTIONS */}
            <fieldset className="border border-dashed border-gray-300 rounded-lg p-6 mb-6">
              <legend className="font-bold text-[#003366] px-2">Transcript Options (if a transcript is one of your deliverables)</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label htmlFor="transcription_mode" className="block text-sm font-medium text-gray-700 mb-2">
                    Transcription Mode
                  </label>
                  <select
                    id="transcription_mode"
                    name="transcription_mode"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                  >
                    <option value="">— Not requesting a transcript —</option>
                    <option value="human">Human</option>
                    <option value="hybrid">Hybrid (AI + Human review)</option>
                    <option value="ai">AI‑only (auto on upload)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="timecode_interval" className="block text-sm font-medium text-gray-700 mb-2">
                    Timestamps
                  </label>
                  <select
                    id="timecode_interval"
                    name="timecode_interval"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                  >
                    <option value="0">None</option>
                    <option value="30">Every 30s</option>
                    <option value="60">Every 60s</option>
                    <option value="300">Every 300s</option>
                    <option value="600">Every 600s</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="speaker_labels" className="block text-sm font-medium text-gray-700 mb-2">
                    Speaker Labels
                  </label>
                  <select
                    id="speaker_labels"
                    name="speaker_labels"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-base focus:ring-2 focus:ring-[#b29dd9] focus:border-[#b29dd9] outline-none"
                  >
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-4">
                AI‑only transcripts don&apos;t need this intake. If you choose &quot;AI‑only,&quot; we&apos;ll auto‑transcribe right after you upload audio, then continue with your document request.
              </p>
            </fieldset>

            <div className="flex items-center gap-3 mt-6">
              <input id="ack" type="checkbox" required className="h-4 w-4 text-[#003366] border-gray-300 rounded focus:ring-[#b29dd9]" />
              <label htmlFor="ack" className="text-sm font-medium text-gray-700">
                I understand Talk to Text Canada provides transcription/formatting, not legal advice.
              </label>
            </div>

            <div className="flex justify-center mt-8 mb-4">
              <button
                type="submit"
                className="bg-[#003366] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#004080] transition-colors duration-200"
              >
                Submit and Continue to Upload
              </button>
            </div>
            <p className="text-center text-sm text-gray-600">
              Your files are handled on Canadian infrastructure. NDAs available on request.
            </p>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
}

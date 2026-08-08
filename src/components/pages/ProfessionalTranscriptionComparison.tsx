import { CheckCircle, XCircle } from 'lucide-react';

const comparisonRows = [
  { label: 'Initial transcription', hybrid: 'AI-generated first', human: 'Human typed from the original audio' },
  { label: 'Professional transcriptionist', hybrid: true, human: true },
  { label: 'Original audio reviewed by a human', hybrid: true, human: true },
  { label: 'Speaker identification and errors reviewed', hybrid: true, human: true },
  { label: 'Missed or misheard words reviewed', hybrid: true, human: true },
  { label: 'Paragraphing and transcript formatting', hybrid: true, human: true },
  { label: 'Proofreading', hybrid: true, human: true },
  { label: 'AI used for the initial transcript', hybrid: 'Yes', human: 'No' },
  { label: 'Professionally prepared finished transcript', hybrid: true, human: true },
  { label: 'Download completed transcript', hybrid: true, human: true },
  { label: 'Transcript Editor Membership / full self-service editor', hybrid: false, human: false },
] as const;

function ComparisonValue({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="inline-flex items-center gap-2 font-medium text-gray-800">
        <CheckCircle className="h-5 w-5 flex-none text-green-600" aria-hidden="true" />
        Included
      </span>
    );
  }

  if (value === false) {
    return (
      <span className="inline-flex items-center gap-2 font-medium text-gray-700">
        <XCircle className="h-5 w-5 flex-none text-gray-400" aria-hidden="true" />
        Not included
      </span>
    );
  }

  return <span className="font-medium text-gray-800">{value}</span>;
}

export function ProfessionalTranscriptionComparison({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-labelledby="professional-comparison-heading">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase text-[#72629E]">Professional Transcription</p>
        <h2 id="professional-comparison-heading" className="mt-2 text-3xl font-bold text-[#003366]">
          Compare Hybrid and Human Transcription
        </h2>
        <p className="mx-auto mt-3 max-w-3xl text-gray-700">
          Both options are professionally prepared and reviewed. Hybrid begins with AI and offers a lower-cost professionally reviewed option; Human is transcribed by a professional from the beginning.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className={`w-full text-left text-sm ${compact ? 'min-w-[680px]' : 'min-w-[760px]'}`}>
          <thead className="bg-[#003366] text-white">
            <tr>
              <th className="p-4 font-semibold">Service detail</th>
              <th className="p-4 font-semibold">Hybrid Transcription</th>
              <th className="p-4 font-semibold">Human Transcription</th>
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map((row, index) => (
              <tr key={row.label} className={`border-t border-gray-200 ${index % 2 ? 'bg-gray-50' : 'bg-white'}`}>
                <th scope="row" className="p-4 font-semibold text-[#003366]">{row.label}</th>
                <td className="p-4"><ComparisonValue value={row.hybrid} /></td>
                <td className="p-4"><ComparisonValue value={row.human} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-center text-sm text-gray-600">
        Transcript Editor Membership is a separate self-service Transcript Workspace product and is not included with either professional service.
      </p>
    </section>
  );
}

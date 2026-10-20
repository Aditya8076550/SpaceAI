import React, { useState } from 'react';
import { CandidateCase, ReviewStatus } from '../types/geospatial';
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  FileText,
  UserCheck,
  Clock,
  Send,
  ShieldCheck,
  History,
} from 'lucide-react';

interface VerificationDeskProps {
  cases: CandidateCase[];
  onUpdateReview: (caseId: string, status: ReviewStatus, notes: string, reviewerName: string) => void;
  onSelectCase: (c: CandidateCase) => void;
}

export const VerificationDesk: React.FC<VerificationDeskProps> = ({
  cases,
  onUpdateReview,
  onSelectCase,
}) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(cases[0]?.id || '');
  const [reviewerName, setReviewerName] = useState<string>('Inspector R. K. Sharma (Mining Circle)');
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('MARKED_FOR_INSPECTION');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [submissionFeedback, setSubmissionFeedback] = useState<string | null>(null);

  const activeCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  const handleSaveDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCase) return;

    onUpdateReview(activeCase.id, reviewStatus, reviewNotes, reviewerName);
    setSubmissionFeedback(`Decision recorded for ${activeCase.id} at ${new Date().toLocaleTimeString()}`);
    setTimeout(() => setSubmissionFeedback(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <UserCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-100 font-mono tracking-wide">
                DISTRICT ENFORCEMENT VERIFICATION DESK
              </h2>
              <p className="text-xs text-slate-400">
                Human-in-the-loop review workflow for remote sensing alerts. All officer actions are persisted.
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <span>Reviewed Cases: </span>
            <span className="text-emerald-400 font-bold">
              {cases.filter((c) => c.reviewStatus !== 'UNREVIEWED').length} / {cases.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form: Log a Review Decision */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider mb-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Record Authorized Verification Decision
          </h3>

          <form onSubmit={handleSaveDecision} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Target Candidate Case:
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => {
                    setSelectedCaseId(e.target.value);
                    const c = cases.find((item) => item.id === e.target.value);
                    if (c) {
                      setReviewStatus(c.reviewStatus);
                      setReviewNotes(c.reviewerNotes || '');
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} - {c.areaHa} ha ({c.category.slice(0, 30)}...)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Enforcement Reviewer Identity:
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Quick Context Card for the selected case */}
            {activeCase && (
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-slate-500 text-[10px] block">AFFECTED AREA</span>
                  <span className="text-slate-200 font-bold">{activeCase.areaHa} ha</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">PRIORITY SCORE</span>
                  <span className="text-emerald-400 font-bold">{activeCase.reviewPriorityScore}/100</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">SPECTRAL ΔBSI</span>
                  <span className="text-amber-400 font-bold">+{activeCase.spectralShift.dBSI}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">PERMIT STATUS</span>
                  <span className="text-slate-400 text-[10px] truncate block">{activeCase.permitStatus}</span>
                </div>
              </div>
            )}

            {/* Decision Radio Buttons */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Verification Determination:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    value: 'MARKED_FOR_INSPECTION',
                    label: 'Mark for Field Inspection',
                    desc: 'Issue official inspection notice to district field enforcement officers.',
                    icon: AlertTriangle,
                    color: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
                  },
                  {
                    value: 'VERIFIED_PHYSICAL_CHANGE',
                    label: 'Verified Physical Change',
                    desc: 'Confirm physical ground excavation occurred (does NOT establish legal illegality).',
                    icon: CheckCircle2,
                    color: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
                  },
                  {
                    value: 'FALSE_POSITIVE',
                    label: 'False Positive',
                    desc: 'Spectral change attributed to agriculture, seasonal dryness, or fire scar.',
                    icon: XCircle,
                    color: 'border-slate-700 bg-slate-950 text-slate-300',
                  },
                  {
                    value: 'INCONCLUSIVE',
                    label: 'Inconclusive / Cloud Artifact',
                    desc: 'Insufficient high-resolution data or persistent cloud cover shadow.',
                    icon: HelpCircle,
                    color: 'border-slate-700 bg-slate-950 text-slate-300',
                  },
                ].map((opt) => {
                  const Icon = opt.icon;
                  const isChecked = reviewStatus === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                        isChecked
                          ? opt.color + ' ring-1 ring-emerald-500'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reviewStatus"
                        value={opt.value}
                        checked={isChecked}
                        onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
                        className="mt-1 accent-emerald-500"
                      />
                      <div>
                        <div className="font-semibold text-xs flex items-center gap-1.5 text-slate-100">
                          <Icon className="h-3.5 w-3.5" />
                          <span>{opt.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 leading-normal font-sans">
                          {opt.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Officer Notes */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Auditor Assessment & Directives:
              </label>
              <textarea
                rows={3}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Enter justification, observed benching features, or specific instructions for ground patrol team..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>

            {submissionFeedback && (
              <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-mono">
                {submissionFeedback}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500 font-mono">
                Decisions are persisted to local case storage.
              </span>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-2 shadow-sm transition-all"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Submit Official Determination</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Audit History Stream */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-400" />
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
              Verification Decisions
            </h3>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto no-scrollbar">
            {cases.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedCaseId(c.id)}
                className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                  selectedCaseId === c.id
                    ? 'border-emerald-500/60 bg-slate-950'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-mono mb-1">
                  <span className="font-bold text-slate-200">{c.id}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded border ${
                      c.reviewStatus === 'MARKED_FOR_INSPECTION'
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold'
                        : c.reviewStatus === 'VERIFIED_PHYSICAL_CHANGE'
                        ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 font-bold'
                        : c.reviewStatus === 'FALSE_POSITIVE'
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                  >
                    {c.reviewStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="text-[11px] text-slate-400 truncate font-sans">
                  {c.category}
                </div>

                {c.reviewerNotes && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400 italic">
                    &quot;{c.reviewerNotes}&quot;
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>{c.reviewerName ? c.reviewerName.slice(0, 18) : 'Unassigned'}</span>
                  <span>{c.reviewedAt ? c.reviewedAt.slice(0, 10) : 'Pending'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { CandidateCase } from '../types/geospatial';
import {
  FileText,
  Download,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Calendar,
  Satellite,
  Compass,
  MapPin,
  ExternalLink,
  Shield,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { formatCoordinates } from '../utils/geoCalculations';
import { generateCasePdf } from '../utils/pdfExport';
import { exportCaseToGeoJSON } from '../utils/geojsonExport';

interface CaseDossierProps {
  candidateCase: CandidateCase | null;
  onUpdateCaseReview: (caseId: string, status: any, notes: string, reviewerName?: string) => void;
  onBackToList: () => void;
}

export const CaseDossier: React.FC<CaseDossierProps> = ({
  candidateCase,
  onUpdateCaseReview,
  onBackToList,
}) => {
  const [geminiExplanation, setGeminiExplanation] = useState<any | null>(null);
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  if (!candidateCase) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-12 text-center text-xs text-slate-400">
        <FileText className="h-10 w-10 mx-auto text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-200">No Case Selected</h3>
        <p className="mt-1 text-slate-500">
          Select a candidate case from the Detection Results table or the Command Centre to inspect its evidence dossier.
        </p>
        <button
          type="button"
          onClick={onBackToList}
          className="mt-4 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold font-mono text-xs hover:bg-emerald-400 transition-colors"
        >
          Browse Detection Results
        </button>
      </div>
    );
  }

  const c = candidateCase;

  const handleRequestGeminiExplanation = async () => {
    setIsExplaining(true);
    setExplainError(null);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseRecord: c }),
      });
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const data = await res.json();
      setGeminiExplanation(data);
    } catch (err: any) {
      console.error('Explanation fetch error:', err);
      setExplainError(err.message || 'Failed to generate analytical summary');
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold font-mono text-emerald-400">
                {c.id}
              </span>
              {c.isDemoCase && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  DEMO BENCHMARK FIXTURE
                </span>
              )}
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  c.reviewPriorityScore >= 85
                    ? 'bg-red-500/10 text-red-300 border-red-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                Review Priority Score: {c.reviewPriorityScore}/100
              </span>
            </div>
            <h2 className="text-sm font-semibold text-slate-200 mt-1">
              {c.category}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Target District: {c.districtName} &bull; Jurisdiction: {c.jurisdiction}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => exportCaseToGeoJSON(c)}
              className="px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Export GeoJSON (RFC 7946)</span>
            </button>

            <button
              type="button"
              onClick={() => generateCasePdf(c)}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Download Evidence PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Technical Evidence & Spectral Indicators */}
        <div className="lg:col-span-2 space-y-6">
          {/* Spatial Geometry & Geodesic Area */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                  Spatial Geometry & Geodesic Area Measurement
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                CRS: EPSG:4326 (WGS 84)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800/80 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[10px] block">AFFECTED SURFACE AREA</span>
                <span className="text-emerald-400 font-bold text-base block mt-0.5">
                  {c.areaHa} ha
                </span>
                <span className="text-[10px] text-slate-500">
                  {c.areaSqm.toLocaleString()} m²
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block">CENTROID COORDINATES</span>
                <span className="text-slate-200 font-semibold text-xs block mt-1">
                  {formatCoordinates(c.centroid[0], c.centroid[1])}
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block">FOOTPRINT CLASSIFICATION</span>
                <span className="text-amber-400 font-semibold text-xs block mt-1">
                  {c.footprintRelation === 'EXPANSION_OUTSIDE_KNOWN_BOUNDARY'
                    ? 'Lease Encroachment'
                    : 'Uninventoried Disturbance'}
                </span>
              </div>

              <div>
                <span className="text-slate-500 text-[10px] block">PERMIT / LEASE STATUS</span>
                <span className="text-slate-300 font-semibold text-xs block mt-1">
                  {c.permitStatus}
                </span>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
              <strong className="text-slate-300">Calculation Methodology:</strong>{' '}
              {c.areaCalculationMethod}. Ellipsoidal quadrature accounts for latitudinal metric convergence on the WGS84 spheroid (semi-major axis: 6,378,137m).
            </div>
          </div>

          {/* Satellite Observations Comparison */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Satellite className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Comparable Satellite Observation Pair (Sentinel-2 MSI)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* T1 Pre-Disturbance */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-bold">T1 (PRE-DISTURBANCE)</span>
                  <span className="text-slate-300">{c.observationT1.date.slice(0, 10)}</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="text-slate-400">
                    <span className="text-slate-500">Scene ID:</span>{' '}
                    <span className="text-slate-200 truncate block">{c.observationT1.sceneId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Platform:</span>
                    <span className="text-slate-200">{c.observationT1.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cloud Cover:</span>
                    <span className="text-slate-200">{c.observationT1.cloudCover}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sun Elevation:</span>
                    <span className="text-slate-200">{c.observationT1.sunElevation}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MGRS Tile:</span>
                    <span className="text-slate-200">{c.observationT1.gridCode}</span>
                  </div>
                </div>
              </div>

              {/* T2 Post-Disturbance */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-emerald-400 font-bold">T2 (CANDIDATE DISTURBANCE)</span>
                  <span className="text-emerald-400">{c.observationT2.date.slice(0, 10)}</span>
                </div>
                <div className="space-y-1 text-[11px]">
                  <div className="text-slate-400">
                    <span className="text-slate-500">Scene ID:</span>{' '}
                    <span className="text-slate-200 truncate block">{c.observationT2.sceneId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Platform:</span>
                    <span className="text-slate-200">{c.observationT2.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cloud Cover:</span>
                    <span className="text-slate-200">{c.observationT2.cloudCover}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sun Elevation:</span>
                    <span className="text-slate-200">{c.observationT2.sunElevation}°</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">MGRS Tile:</span>
                    <span className="text-slate-200">{c.observationT2.gridCode}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spectral Shift & Evidence Breakdown */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider mb-4">
              Multi-Spectral Disturbance Indicators
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">ΔBSI (BARE SOIL / ROCK)</span>
                <span className="text-amber-400 font-bold text-lg block mt-0.5">
                  +{c.spectralShift.dBSI}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Pre: {c.spectralShift.preMeanBSI} &rarr; Post: {c.spectralShift.postMeanBSI}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">ΔNDVI (VEGETATION LOSS)</span>
                <span className="text-red-400 font-bold text-lg block mt-0.5">
                  {c.spectralShift.dNDVI}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Pre: {c.spectralShift.preMeanNDVI} &rarr; Post: {c.spectralShift.postMeanNDVI}
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">ΔNDMI (MOISTURE DROP)</span>
                <span className="text-blue-400 font-bold text-lg block mt-0.5">
                  {c.spectralShift.dNDMI}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Loss of surface water
                </span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-500 text-[10px] block">SPATIAL COHERENCE</span>
                <span className="text-slate-100 font-bold text-lg block mt-0.5">
                  {c.evidenceScores.spatialCoherenceScore}/100
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Contiguous pit clustering
                </span>
              </div>
            </div>

            {/* Environmental Sensitivity Warning */}
            {c.environmentalOverlap && (
              <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Sensitive Zone Overlap / Proximity: </span>
                  <span>{c.environmentalOverlap}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Analytical Assistant & Officer Review */}
        <div className="space-y-6">
          {/* Gemini AI Inspector Assistant */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                  Analyst Assistant
                </h3>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                Grounded Reasoning
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4 font-sans">
              Generate an evidence-grounded analytical briefing for district field inspectors, identifying key uncertainties, alternative hypotheses, and audit questions.
            </p>

            <button
              type="button"
              onClick={handleRequestGeminiExplanation}
              disabled={isExplaining}
              className="w-full py-2 px-3 rounded-lg bg-slate-950 border border-emerald-500/40 hover:border-emerald-400 text-emerald-300 font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Sparkles className={`h-3.5 w-3.5 ${isExplaining ? 'animate-spin' : ''}`} />
              <span>{isExplaining ? 'Synthesizing Evidence Dossier...' : 'Explain This Case with AI'}</span>
            </button>

            {explainError && (
              <div className="mt-3 p-2.5 rounded bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                {explainError}
              </div>
            )}

            {geminiExplanation && (
              <div className="mt-4 pt-4 border-t border-slate-800 space-y-3.5 text-xs font-sans">
                <div>
                  <div className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider mb-1">
                    EXECUTIVE SUMMARY
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800">
                    {geminiExplanation.summary}
                  </p>
                </div>

                {geminiExplanation.fieldInspectorQuestions?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">
                      QUESTIONS FOR FIELD INSPECTOR
                    </div>
                    <ul className="space-y-1.5 text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px]">
                      {geminiExplanation.fieldInspectorQuestions.map((q: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-amber-400 font-mono font-bold">{i + 1}.</span>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {geminiExplanation.mainUncertainties?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
                      KEY UNCERTAINTIES & LIMITATIONS
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
                      {geminiExplanation.mainUncertainties.map((u: string, i: number) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Alternative Explanations & False-Positive Audit */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Plausible Alternative Explanations
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Spectral change alone is not legal proof of quarrying. Enforcement officers must rule out alternative surface disturbances:
            </p>
            <ul className="space-y-2 text-xs font-sans text-slate-300">
              {c.alternativeExplanations.map((alt, idx) => (
                <li key={idx} className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-start gap-2">
                  <span className="text-slate-500 font-mono text-[10px] mt-0.5">&bull;</span>
                  <span className="text-[11px]">{alt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CandidateCase, ReviewStatus } from '../types/geospatial';
import {
  FileText,
  Download,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Calendar,
  Satellite,
  Compass,
  ArrowLeft,
  Shield,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { formatCoordinates } from '../utils/geoCalculations';
import { generateCasePdf } from '../utils/pdfExport';
import { exportCaseToGeoJSON } from '../utils/geojsonExport';

interface CaseReportSectionProps {
  cases: CandidateCase[];
  selectedCase: CandidateCase | null;
  onSelectCase: (c: CandidateCase) => void;
  onUpdateCaseReview: (caseId: string, status: ReviewStatus, notes: string, reviewerName?: string) => void;
  onNavigateToMap: () => void;
}

export const CaseReportSection: React.FC<CaseReportSectionProps> = ({
  cases,
  selectedCase,
  onSelectCase,
  onUpdateCaseReview,
  onNavigateToMap,
}) => {
  const currentCase = selectedCase || (cases.length > 0 ? cases[0] : null);

  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<L.Map | null>(null);

  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(
    currentCase?.reviewStatus || 'UNREVIEWED'
  );
  const [reviewerNotes, setReviewerNotes] = useState<string>(
    currentCase?.reviewerNotes || ''
  );
  const [reviewerName, setReviewerName] = useState<string>(
    currentCase?.reviewerName || 'District Mining Inspector'
  );
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Sync state if selected case changes
  useEffect(() => {
    if (currentCase) {
      setReviewStatus(currentCase.reviewStatus);
      setReviewerNotes(currentCase.reviewerNotes || '');
      setReviewerName(currentCase.reviewerName || 'District Mining Inspector');
      setSaveSuccess(false);
    }
  }, [currentCase?.id]);

  // Render Mini-Map centered on candidate polygon
  useEffect(() => {
    if (!currentCase || !miniMapContainerRef.current) return;

    if (miniMapInstanceRef.current) {
      miniMapInstanceRef.current.remove();
      miniMapInstanceRef.current = null;
    }

    const [centroidLat, centroidLon] = currentCase.centroid;
    const map = L.map(miniMapContainerRef.current, {
      center: [centroidLat, centroidLon],
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // High resolution satellite basemap
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19 }
    ).addTo(map);

    // Draw Candidate Disturbance Polygon
    const coords = currentCase.geometry.coordinates[0];
    const latLngs = coords.map(([lon, lat]) => [lat, lon] as [number, number]);

    const polygon = L.polygon(latLngs, {
      color: '#ef4444',
      weight: 3,
      fillColor: '#ef4444',
      fillOpacity: 0.45,
    }).addTo(map);

    // Centroid marker
    L.circleMarker([centroidLat, centroidLon], {
      radius: 6,
      color: '#ffffff',
      weight: 2,
      fillColor: '#ef4444',
      fillOpacity: 1,
    })
      .bindTooltip(`Centroid: ${formatCoordinates(centroidLat, centroidLon)}`, { permanent: false })
      .addTo(map);

    map.fitBounds(polygon.getBounds(), { padding: [30, 30] });
    miniMapInstanceRef.current = map;

    return () => {
      map.remove();
      miniMapInstanceRef.current = null;
    };
  }, [currentCase?.id]);

  if (!currentCase) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-12 text-center text-xs text-slate-400 font-sans">
        <FileText className="h-10 w-10 mx-auto text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-200">No Candidate Case Selected</h3>
        <p className="mt-1 text-slate-500">
          Run the detection pipeline or select a candidate case from the Satellite Map to view its full dossier.
        </p>
        <button
          type="button"
          onClick={onNavigateToMap}
          className="mt-4 px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold font-mono text-xs hover:bg-emerald-400 transition-colors"
        >
          Return to Satellite Map
        </button>
      </div>
    );
  }

  const c = currentCase;

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCaseReview(c.id, reviewStatus, reviewerNotes, reviewerName);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Bar with Case Selector & Export Actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        {/* Case Selector Dropdown if multiple cases */}
        {cases.length > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <span className="font-semibold text-slate-200">Select Case Report:</span>
            </div>
            <div className="flex items-center gap-2">
              {cases.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectCase(item)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                    item.id === c.id
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {item.id} ({item.areaHa} ha)
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-bold font-mono text-emerald-400">
                {c.id}
              </span>
              {c.isDemoCase && (
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  DEMONSTRATION BENCHMARK REPORT
                </span>
              )}
              <span
                className={`text-[10px] font-mono px-2.5 py-0.5 rounded border ${
                  c.reviewPriorityScore >= 85
                    ? 'bg-red-500/10 text-red-300 border-red-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                Review Priority: {c.reviewPriorityScore}/100
              </span>
            </div>
            <h2 className="text-sm font-semibold text-slate-200 mt-1">
              {c.category}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Target District: {c.districtName} &bull; Jurisdiction: {c.jurisdiction}
            </p>
          </div>

          {/* Export Buttons */}
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

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Evidence Dossier & Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Spatial Map & Area Summary */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                  Disturbance Perimeter &amp; Geodesic Area
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                CRS: EPSG:4326 (WGS 84)
              </span>
            </div>

            {/* Interactive Mini-Map */}
            <div className="relative rounded-lg overflow-hidden border border-slate-800">
              <div ref={miniMapContainerRef} className="h-64 w-full bg-slate-950" />
              <div className="absolute bottom-2 left-2 z-[400] bg-slate-950/90 px-2 py-1 rounded text-[10px] font-mono text-slate-300 border border-slate-800">
                Centroid: {formatCoordinates(c.centroid[0], c.centroid[1])}
              </div>
            </div>

            {/* 4 Quantitative Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs">
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
                <span className="text-slate-500 text-[10px] block">FOOTPRINT RELATION</span>
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

            <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded border border-slate-800/60 font-mono">
              <strong className="text-slate-300">Area Measurement Method:</strong>{' '}
              {c.areaCalculationMethod}. Uses geodesic ellipsoidal quadrature across WGS84 coordinates to eliminate planar projection distortion.
            </div>
          </div>

          {/* Satellite Observations Comparison Pair */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Satellite className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Comparable Satellite Observation Pair (Sentinel-2 L2A)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* T1 Pre-Disturbance */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-bold">T1 (BEFORE DISTURBANCE)</span>
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
                    <span className="text-slate-500">MGRS Grid:</span>
                    <span className="text-slate-200">{c.observationT1.gridCode}</span>
                  </div>
                </div>
              </div>

              {/* T2 Post-Disturbance */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-emerald-400 font-bold">T2 (AFTER DISTURBANCE)</span>
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
                    <span className="text-slate-500">MGRS Grid:</span>
                    <span className="text-slate-200">{c.observationT2.gridCode}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spectral Shift Evidence */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
              Multi-Spectral Disturbance Evidence
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
                  Contiguous pit grouping
                </span>
              </div>
            </div>

            {c.environmentalOverlap && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Sensitive Zone Overlap / Proximity: </span>
                  <span>{c.environmentalOverlap}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Review Determination & Inspector Checklist */}
        <div className="space-y-6">
          {/* Officer Review Form */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Officer Review &amp; Field Decision
              </h3>
            </div>

            <form onSubmit={handleSaveReview} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px] block">
                  Review Determination:
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as ReviewStatus)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                >
                  <option value="UNREVIEWED">Unreviewed (Pending Initial Triage)</option>
                  <option value="MARKED_FOR_INSPECTION">Marked for Urgent Field Inspection</option>
                  <option value="VERIFIED_PHYSICAL_CHANGE">Verified Physical Change (Quarry Expansion)</option>
                  <option value="FALSE_POSITIVE">Dismissed as False Positive</option>
                  <option value="INCONCLUSIVE">Inconclusive (Requires Aerial Drone Data)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px] block">
                  Inspector Name / Designation:
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. Authorized District Mining Officer"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-mono text-[11px] block">
                  Ground Audit Notes:
                </label>
                <textarea
                  rows={3}
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="Record field observations, survey pillar inspection findings, or equipment present..."
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <span>Save Review Determination</span>
              </button>

              {saveSuccess && (
                <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center font-mono">
                  Review determination updated successfully!
                </div>
              )}
            </form>
          </div>

          {/* Alternative Explanations & False Positive Evaluation */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Plausible Alternative Explanations
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Spectral change indicates ground disturbance, but officers must verify whether legal alternatives explain the reflectance drop:
            </p>
            <ul className="space-y-2 text-xs text-slate-300">
              {c.alternativeExplanations.map((alt, idx) => (
                <li key={idx} className="bg-slate-950 p-2.5 rounded border border-slate-800 flex items-start gap-2">
                  <span className="text-slate-500 font-mono text-[10px] mt-0.5">&bull;</span>
                  <span className="text-[11px]">{alt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Field Inspector Ground Checklist */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-emerald-400" />
              <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                Field Inspection Checklist
              </h3>
            </div>
            <ol className="space-y-1.5 text-[11px] text-slate-300 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800">
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">1.</span>
                <span>Check demarcated lease boundary survey pillars (pegs).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">2.</span>
                <span>Inspect whether excavators, rock breakers, or trucks are present.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">3.</span>
                <span>Audit mineral dispatch transit passes (e-Permits).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">4.</span>
                <span>Verify environmental clearance &amp; Consent to Operate (CTO).</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">5.</span>
                <span>Capture GPS geotagged photographs at pit perimeter.</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Statutory Legal Notice */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-[11px] text-slate-400 leading-relaxed font-sans">
        <strong className="text-slate-300 font-mono uppercase block mb-1">
          Statutory Geospatial Intelligence Notice &amp; Limitation:
        </strong>
        Satellite imagery establishes observed physical land-cover change only. It cannot independently determine ownership, intent, permit validity, or statutory violation. This dossier serves strictly as an objective technical aid for inspection prioritization under district administrative authority.
      </div>
    </div>
  );
};

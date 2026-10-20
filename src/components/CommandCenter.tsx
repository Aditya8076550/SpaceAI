import React, { useState } from 'react';
import {
  DistrictBoundary,
  CandidateCase,
  ObservationMetadata,
} from '../types/geospatial';
import {
  Satellite,
  Calendar,
  Layers,
  Search,
  Play,
  AlertCircle,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  MapPin,
  Clock,
  Sparkles,
  FileCheck2,
} from 'lucide-react';
import { formatCoordinates } from '../utils/geoCalculations';

interface CommandCenterProps {
  districts: DistrictBoundary[];
  selectedDistrict: DistrictBoundary;
  onSelectDistrict: (d: DistrictBoundary) => void;
  isDemoMode: boolean;
  onRunDetector: (t1Date: string, t2Date: string) => Promise<void>;
  isProcessing: boolean;
  processingLog: string[];
  cases: CandidateCase[];
  onSelectCase: (c: CandidateCase) => void;
  discoveredScenes: any[];
  onSearchSatelliteScenes: () => Promise<void>;
  isSearchingScenes: boolean;
  stacError: string | null;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  districts,
  selectedDistrict,
  onSelectDistrict,
  isDemoMode,
  onRunDetector,
  isProcessing,
  processingLog,
  cases,
  onSelectCase,
  discoveredScenes,
  onSearchSatelliteScenes,
  isSearchingScenes,
  stacError,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
}) => {
  const [maxCloud, setMaxCloud] = useState<number>(15);

  const pendingReviewCount = cases.filter(
    (c) => c.reviewStatus === 'UNREVIEWED' || c.reviewStatus === 'MARKED_FOR_INSPECTION'
  ).length;

  const totalHectaresDetected = cases.reduce((acc, c) => acc + c.areaHa, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner: District Profile & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* District Selector & Details */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider font-mono">
                Jurisdiction & Area of Interest
              </h2>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-mono border ${
                selectedDistrict.jurisdictionStatus === 'VERIFIED_ADMIN_UNIT'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              {selectedDistrict.jurisdictionStatus === 'VERIFIED_ADMIN_UNIT'
                ? 'Verified Administrative Unit'
                : 'Unverified Custom AOI'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Target Mining District:
              </label>
              <select
                value={selectedDistrict.id}
                onChange={(e) => {
                  const found = districts.find((d) => d.id === e.target.value);
                  if (found) onSelectDistrict(found);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.state}, {d.country})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Primary Mineral Commodity:
              </label>
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono">
                {selectedDistrict.miningCategory}
              </div>
            </div>
          </div>

          {/* Technical Metadata Box */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div>
              <div className="text-slate-500 text-[10px]">COORDINATES (CENTROID)</div>
              <div className="text-slate-200 mt-0.5">
                {formatCoordinates(selectedDistrict.center[0], selectedDistrict.center[1])}
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">BBOX EXTENT (WGS84)</div>
              <div className="text-slate-200 mt-0.5">
                [{selectedDistrict.bbox.join(', ')}]
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">MONITORED AOI AREA</div>
              <div className="text-slate-200 mt-0.5 font-bold">
                {selectedDistrict.totalAreaSqKm} km²
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">KNOWN LEASE POLYGONS</div>
              <div className="text-slate-200 mt-0.5 text-emerald-400 font-bold">
                {selectedDistrict.knownQuarriesCount} Registered Blocks
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[11px] text-slate-400">
            <span>
              <strong className="text-slate-300">Administrative Source:</strong>{' '}
              {selectedDistrict.administrativeSource}
            </span>
            <span className="font-mono text-slate-500">CRS: EPSG:4326 (WGS 84)</span>
          </div>
        </div>

        {/* Operational Metrics Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase font-mono tracking-wider">
                Current Case Queue
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {isDemoMode ? 'BENCHMARK FIXTURES' : 'LIVE DETECTIONS'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="text-slate-400 text-xs">Total Candidates</div>
                <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
                  {cases.length}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {totalHectaresDetected.toFixed(1)} ha affected
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3">
                <div className="text-slate-400 text-xs">Requires Inspection</div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {pendingReviewCount}
                </div>
                <div className="text-[11px] text-amber-400/70 mt-1">
                  Priority follow-up
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg p-3 text-xs space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>Change Detector:</span>
              <span className="font-mono text-slate-200">TerraSentinel-BSI-v1.4</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Minimum Area Threshold:</span>
              <span className="font-mono text-slate-200">0.50 ha (50 pixels)</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Cloud Masking:</span>
              <span className="font-mono text-emerald-400">SCL Layer Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Satellite Imagery Discovery & Pipeline Execution */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2.5">
            <Satellite className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono tracking-wide">
                SENTINEL-2 L2A STAC DISCOVERY & COMPARISON PIPELINE
              </h3>
              <p className="text-xs text-slate-400">
                Earth Search STAC Collection: <code className="text-slate-300">sentinel-2-l2a</code> (10m MultiSpectral Instrument)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSearchSatelliteScenes}
              disabled={isSearchingScenes || isProcessing}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium border border-slate-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Search className={`h-3.5 w-3.5 ${isSearchingScenes ? 'animate-spin' : ''}`} />
              {isSearchingScenes ? 'Querying STAC...' : 'Query Real STAC Scenes'}
            </button>

            <button
              type="button"
              onClick={() => onRunDetector(startDate, endDate)}
              disabled={isProcessing}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 fill-current ${isProcessing ? 'animate-spin' : ''}`} />
              {isProcessing ? 'Processing Pipeline...' : 'Run Quarry Detector'}
            </button>
          </div>
        </div>

        {/* Date and Cloud Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Observation 1 (Pre-Disturbance Baseline):
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Observation 2 (Candidate Disturbance):
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Max Cloud Cover Filter: <span className="text-emerald-400 font-mono">{maxCloud}%</span>
            </label>
            <input
              type="range"
              min="1"
              max="30"
              value={maxCloud}
              onChange={(e) => setMaxCloud(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 mt-2"
            />
          </div>
        </div>

        {/* STAC Error or Feedback */}
        {stacError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold">STAC Catalog Connection Notice:</div>
              <div>{stacError}</div>
              <div className="mt-1 text-slate-400 text-[11px]">
                You can switch to <strong>DEMONSTRATION MODE</strong> above to inspect verified ground-truth benchmark cases.
              </div>
            </div>
          </div>
        )}

        {/* Discovered Scenes List */}
        {discoveredScenes.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-mono text-slate-300 font-semibold">
                Available Real Sentinel-2 Observations ({discoveredScenes.length} scenes retrieved):
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Source: Earth Search AWS Element 84
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {discoveredScenes.slice(0, 6).map((scene: any) => (
                <div
                  key={scene.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs space-y-1.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-200">
                      {scene.datetime?.slice(0, 10)}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                        scene.cloudCover < 5
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      Cloud: {scene.cloudCover?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate" title={scene.id}>
                    {scene.id}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-900">
                    <span>Sun Elev: {scene.sunElevation?.toFixed(1)}°</span>
                    <span>Tile: {scene.gridCode}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Logs Console */}
        {processingLog.length > 0 && (
          <div className="mt-4 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs">
            <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1.5 font-bold">
              <Clock className="h-3.5 w-3.5 text-emerald-400" />
              PIPELINE EXECUTION TELEMETRY
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto text-[11px]">
              {processingLog.map((log, idx) => (
                <div key={idx} className="text-slate-300">
                  <span className="text-slate-600 mr-2">[{new Date().toISOString().slice(11, 19)}]</span>
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Candidate Queue Table Preview */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100 font-mono uppercase tracking-wider">
              Prioritised Case Queue ({cases.length} Candidates)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Click any case to inspect detailed evidence dossier
          </span>
        </div>

        {cases.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/60 rounded-lg border border-dashed border-slate-800 text-xs text-slate-400">
            <Satellite className="h-8 w-8 mx-auto text-slate-600 mb-2" />
            <div className="font-semibold text-slate-300">No disturbance candidates currently loaded</div>
            <div className="text-slate-500 mt-1">
              Select date pair above and click &quot;Run Quarry Detector&quot; or toggle Demonstration Mode.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-mono uppercase tracking-wider">
                  <th className="py-2.5 px-3">Case ID</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Affected Area</th>
                  <th className="py-2.5 px-3">Spectral Shift</th>
                  <th className="py-2.5 px-3">Priority Score</th>
                  <th className="py-2.5 px-3">Permit Status</th>
                  <th className="py-2.5 px-3">Review Decision</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {cases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-emerald-400">
                      {c.id}
                      {c.isDemoCase && (
                        <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                          DEMO
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-200">
                      <div className="font-medium text-xs truncate max-w-xs">{c.category}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {c.footprintRelation === 'EXPANSION_OUTSIDE_KNOWN_BOUNDARY'
                          ? 'Encroachment beyond lease'
                          : 'General candidate disturbance'}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-200 font-bold">
                      {c.areaHa} ha
                      <span className="text-[10px] text-slate-500 block font-normal">
                        {c.areaSqm.toLocaleString()} m²
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs">
                      <span className="text-red-400">ΔNDVI: {c.spectralShift.dNDVI}</span>
                      <span className="text-amber-400 block">ΔBSI: +{c.spectralShift.dBSI}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              c.reviewPriorityScore >= 85
                                ? 'bg-red-500'
                                : c.reviewPriorityScore >= 70
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${c.reviewPriorityScore}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-200">{c.reviewPriorityScore}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-sans text-slate-400 text-[11px]">
                      {c.permitStatus}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono border ${
                          c.reviewStatus === 'MARKED_FOR_INSPECTION'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold'
                            : c.reviewStatus === 'VERIFIED_PHYSICAL_CHANGE'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 font-bold'
                            : c.reviewStatus === 'FALSE_POSITIVE'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        {c.reviewStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(c);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-sans transition-colors"
                      >
                        Open Dossier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

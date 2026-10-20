import React, { useState } from 'react';
import { CandidateCase, DistrictBoundary } from '../types/geospatial';
import {
  Layers,
  Play,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Info,
  Clock,
  Compass,
  FileText,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import { formatCoordinates } from '../utils/geoCalculations';

interface ChangeDetectionSectionProps {
  selectedDistrict: DistrictBoundary;
  cases: CandidateCase[];
  onSelectCase: (c: CandidateCase) => void;
  onNavigateToReport: () => void;
  onRunBenchmarkDetection: () => Promise<void>;
  isProcessing: boolean;
  processingLogs: string[];
}

export const ChangeDetectionSection: React.FC<ChangeDetectionSectionProps> = ({
  selectedDistrict,
  cases,
  onSelectCase,
  onNavigateToReport,
  onRunBenchmarkDetection,
  isProcessing,
  processingLogs,
}) => {
  return (
    <div className="space-y-6 font-sans">
      {/* Top Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold font-mono text-emerald-400">
              Change Detection Pipeline
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              SPECTRAL DIFFERENTIAL ALGORITHM
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Detecting candidate surface disturbance and quarry expansion using multi-temporal Sentinel-2 spectral indices
          </p>
        </div>

        <button
          type="button"
          onClick={onRunBenchmarkDetection}
          disabled={isProcessing}
          className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all"
        >
          <Play className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
          <span>{isProcessing ? 'Executing Detection Pipeline...' : 'Run Change Detection (Demonstration Benchmark)'}</span>
        </button>
      </div>

      {/* Honest Data Disclosure Banner (Anti-Faking / Full Transparency) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
          <Info className="h-4 w-4 text-emerald-400" />
          <span>System Architecture &amp; Data Transparency Disclosure</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-emerald-400 font-mono flex items-center gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>What is Real</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              Live <strong>STAC Scene Discovery</strong> connects directly to the Earth Search AWS Sentinel-2 catalog. It searches authentic ESA Sentinel-2 Level-2A scenes over the district with real dates, cloud percentages, solar angles, and Cloud-Optimized GeoTIFF URLs.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-amber-400 font-mono flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>What is Demonstration-Only</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              In-browser pixel processing: A full Sentinel-2 tile is ~500 MB per band. Web browsers cannot download and decode gigabytes of multi-band GeoTIFFs directly in JavaScript without exceeding memory limits. The prototype therefore executes the algorithm on <strong>verified benchmark scenarios</strong> from known quarrying corridors.
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-sky-400 font-mono flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5" />
              <span>What Needs Cloud Backend</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              An operational production deployment requires a server-side raster worker (Python GDAL/Rasterio or Google Earth Engine) to clip the bounding box and stream only differential matrices to the browser.
            </p>
          </div>
        </div>
      </div>

      {/* Detection Algorithm Explanation (Educational for First-Year Students and Judges) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
          How the 4-Step Land Change Detection Algorithm Works
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          {/* Step 1 */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <div className="text-[10px] text-emerald-400 font-bold">STEP 1: QUALITY MASKING</div>
            <div className="font-bold text-slate-200 text-xs">Scene Classification (SCL)</div>
            <p className="text-slate-400 text-[11px] font-sans pt-1">
              Filters out cloud pixels (SCL 8, 9), cirrus (SCL 10), and cloud shadows (SCL 3) to prevent false-positive change alerts.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <div className="text-[10px] text-emerald-400 font-bold">STEP 2: SPECTRAL INDICES</div>
            <div className="font-bold text-slate-200 text-xs">NDVI &amp; Bare Soil Index (BSI)</div>
            <p className="text-slate-400 text-[11px] font-sans pt-1">
              Computes NDVI = (NIR - Red) / (NIR + Red) for vegetation loss, and BSI = ((SWIR + Red) - (NIR + Blue)) / ((SWIR + Red) + (NIR + Blue)) for exposed mineral bedrock.
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <div className="text-[10px] text-emerald-400 font-bold">STEP 3: CHANGE THRESHOLD</div>
            <div className="font-bold text-slate-200 text-xs">ΔNDVI ≤ -0.25 &amp; ΔBSI ≥ +0.20</div>
            <p className="text-slate-400 text-[11px] font-sans pt-1">
              Identifies pixels where vegetation was abruptly removed AND bare mineral soil/rock increased simultaneously.
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 space-y-1">
            <div className="text-[10px] text-emerald-400 font-bold">STEP 4: SPATIAL CLUSTERING</div>
            <div className="font-bold text-slate-200 text-xs">8-Connected Clustered Area</div>
            <p className="text-slate-400 text-[11px] font-sans pt-1">
              Groups neighboring 10m pixels. Discards clusters under 0.5 ha to filter out noise, then calculates WGS84 geodesic area.
            </p>
          </div>
        </div>
      </div>

      {/* Execution Logs */}
      {processingLogs.length > 0 && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
            <span className="font-bold text-slate-300">DETECTOR EXECUTION LOGS</span>
            <span className="text-[10px] text-emerald-400">{processingLogs.length} steps recorded</span>
          </div>
          <div className="space-y-1 max-h-44 overflow-y-auto pr-2 text-[11px]">
            {processingLogs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 text-slate-300">
                <span className="text-slate-600 select-none">&gt;</span>
                <span className={log.includes('complete') || log.includes('verified') ? 'text-emerald-400 font-semibold' : ''}>
                  {log}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidate Land Disturbance Results */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-mono">
              Detected Candidate Land Disturbances ({cases.length})
            </h3>
            <p className="text-xs text-slate-400">
              Categorized as candidate land disturbance for ground verification (not confirmed illegal quarrying)
            </p>
          </div>
        </div>

        {cases.length === 0 ? (
          <div className="bg-slate-950 rounded-lg p-8 text-center text-xs text-slate-400 border border-slate-800">
            <Layers className="h-8 w-8 mx-auto text-slate-600 mb-2" />
            <p className="text-slate-300 font-semibold">No Candidate Disturbances Loaded</p>
            <p className="mt-1 text-slate-500">
              Click &quot;Run Change Detection (Demonstration Benchmark)&quot; above to execute the pipeline on benchmark data.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cases.map((c) => (
              <div
                key={c.id}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all space-y-3 font-sans"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-emerald-400">{c.id}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                        {c.isDemoCase ? 'BENCHMARK CASE' : 'DETECTED'}
                      </span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-200 mt-1">
                      {c.category}
                    </h4>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${
                      c.reviewPriorityScore >= 85
                        ? 'bg-red-500/10 text-red-300 border-red-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    Priority: {c.reviewPriorityScore}/100
                  </span>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 font-mono text-xs">
                  <div>
                    <span className="text-slate-500 text-[10px] block">AFFECTED AREA</span>
                    <span className="text-emerald-400 font-bold text-sm block mt-0.5">{c.areaHa} ha</span>
                    <span className="text-[10px] text-slate-500">{c.areaSqm.toLocaleString()} m²</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">SPECTRAL SHIFT</span>
                    <span className="text-red-400 font-semibold text-xs block mt-0.5">ΔNDVI: {c.spectralShift.dNDVI}</span>
                    <span className="text-amber-400 font-semibold text-xs block">ΔBSI: +{c.spectralShift.dBSI}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block">TIMELINE</span>
                    <span className="text-slate-300 text-[11px] block mt-0.5">T1: {c.observationT1.date.slice(0, 10)}</span>
                    <span className="text-slate-300 text-[11px] block">T2: {c.observationT2.date.slice(0, 10)}</span>
                  </div>
                </div>

                {/* Action button */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Coords: {formatCoordinates(c.centroid[0], c.centroid[1])}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectCase(c);
                      onNavigateToReport();
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <span>Open Case Report</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Limitations & Legal Notice */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
          <ShieldAlert className="h-4 w-4" />
          <span>Operational Limitations &amp; Uncertainty Disclosures</span>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-400 font-sans">
          <li className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <strong className="text-slate-200 block mb-0.5">1. Candidate Disturbance vs. Legal Violation</strong>
            Satellite reflectance establishes physical ground alteration only. It cannot verify mineral ownership, lease validity, or statutory permission without ground registry correlation.
          </li>
          <li className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <strong className="text-slate-200 block mb-0.5">2. Agricultural False Positives</strong>
            Post-harvest agricultural drying produces spectral signals (NDVI drop, bare soil increase) similar to open-pit earthwork. Spatial clustering helps filter this.
          </li>
          <li className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <strong className="text-slate-200 block mb-0.5">3. Spatial Resolution Limits (10 Meters)</strong>
            Sentinel-2 cannot resolve individual machinery (backhoes, dump trucks) or survey boundary stones. Sub-meter drone or commercial imagery is required for micro-evidence.
          </li>
          <li className="bg-slate-950 p-3 rounded-lg border border-slate-800">
            <strong className="text-slate-200 block mb-0.5">4. Cloud Obstruction Gaps</strong>
            Monsoon weather causes data gaps where cloud-free observations may not be available for several weeks.
          </li>
        </ul>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Layers,
  AlertTriangle,
  FileCode,
  Activity,
  Compass,
  Cpu,
  HelpCircle,
  Clock,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { runPipelineTestSuite, TestCaseResult } from '../utils/pipelineTests';

export const PipelineAuditView: React.FC = () => {
  const [testResults, setTestResults] = useState<TestCaseResult[]>(() => runPipelineTestSuite());
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'tests' | 'trace' | 'risks'>('tests');

  const handleRunTests = () => {
    setIsRunningTests(true);
    setTimeout(() => {
      const results = runPipelineTestSuite();
      setTestResults(results);
      setIsRunningTests(false);
    }, 400);
  };

  const passedCount = testResults.filter((t) => t.passed).length;
  const totalCount = testResults.length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 font-mono tracking-wide">
                DETECTOR PIPELINE AUDIT & REPRODUCIBLE TEST SUITE
              </h2>
              <p className="text-xs text-slate-400">
                Scientific audit verifying inputs, SCL masks, spectral indices, spatial filters, and geodesic outputs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs font-mono px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2">
              <span className="text-slate-400">Test Suite Status:</span>
              <span className="text-emerald-400 font-bold">
                {passedCount}/{totalCount} PASSED
              </span>
            </div>

            <button
              type="button"
              onClick={handleRunTests}
              disabled={isRunningTests}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              <Play className={`h-3.5 w-3.5 fill-current ${isRunningTests ? 'animate-spin' : ''}`} />
              <span>{isRunningTests ? 'Executing Tests...' : 'Run Test Suite'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-view Navigation */}
      <div className="flex items-center border-b border-slate-800 space-x-2 text-xs font-mono">
        <button
          type="button"
          onClick={() => setActiveTab('tests')}
          className={`py-2 px-3.5 border-b-2 font-medium transition-colors ${
            activeTab === 'tests'
              ? 'border-emerald-400 text-emerald-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Unit Test Suite ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('trace')}
          className={`py-2 px-3.5 border-b-2 font-medium transition-colors ${
            activeTab === 'trace'
              ? 'border-emerald-400 text-emerald-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Pipeline Step Trace (11 Stages)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('risks')}
          className={`py-2 px-3.5 border-b-2 font-medium transition-colors ${
            activeTab === 'risks'
              ? 'border-emerald-400 text-emerald-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          False-Positive Risks & Assumptions
        </button>
      </div>

      {/* TAB 1: Reproducible Unit Test Suite */}
      {activeTab === 'tests' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {testResults.map((test) => (
              <div
                key={test.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3 font-sans"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    {test.passed ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-100">
                          {test.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                          {test.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{test.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-slate-500 text-[11px]">Latency: {test.executionTimeMs}ms</span>
                    <span
                      className={`px-2.5 py-0.5 rounded font-bold text-[10px] border ${
                        test.passed
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-red-500/10 text-red-300 border-red-500/30'
                      }`}
                    >
                      {test.passed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">INPUT CONDITIONS</span>
                    <span className="text-slate-300 text-[11px] block mt-1">{test.inputSpecification}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">EXPECTED MATHEMATICAL OUTPUT</span>
                    <span className="text-emerald-400 text-[11px] block mt-1">{test.expectedOutput}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] block uppercase">MEASURED EXECUTION OUTPUT</span>
                    <span className="text-slate-100 font-bold text-[11px] block mt-1">{test.measuredOutput}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-950/40 px-3 py-2 rounded border border-slate-800/60 font-sans">
                  <strong className="text-slate-300 font-mono">Scientific Trace:</strong> {test.scientificTrace}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Pipeline Step Trace */}
      {activeTab === 'trace' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-mono">
              MATHEMATICAL TRACE OF THE LAND-CHANGE DETECTION ENGINE
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Every step from raw Sentinel-2 BOA reflectance arrays to the vectorized GeoJSON candidate polygon.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                step: '1. Input Validation & Spatial Alignment',
                formula: 'Rows = N, Cols = M, Res = 10m (CRS: EPSG:32643 / EPSG:4326)',
                desc: 'Validates that observation pair T1 and T2 share identical pixel dimensions and bounding box extents.',
              },
              {
                step: '2. Scene Classification Layer (SCL) Quality Masking',
                formula: 'ValidMask = SCL ∉ {3 (Cloud Shadow), 8 (Cloud Med), 9 (Cloud High), 10 (Cirrus), 11 (Snow)}',
                desc: 'Masks all atmospheric cloud and cloud-shadow pixels prior to computing spectral indices to eliminate false spikes.',
              },
              {
                step: '3. Normalized Difference Vegetation Index (NDVI)',
                formula: 'NDVI = (B08 - B04) / (B08 + B04)',
                desc: 'Sensitive to loss of green photosynthetic canopy. Dense forest NDVI ~0.65 to 0.85; cleared ground NDVI < 0.20.',
              },
              {
                step: '4. Bare Soil & Mineral Index (BSI)',
                formula: 'BSI = [(B11 + B04) - (B08 + B02)] / [(B11 + B04) + (B08 + B02)]',
                desc: 'Combines SWIR1 (B11) and Red (B04) absorption to isolate exposed bedrock, iron ore hematite, granite benches, and aggregate pits.',
              },
              {
                step: '5. Comparative Differential Thresholding',
                formula: '(ΔNDVI ≤ -0.22) ∧ (ΔBSI ≥ +0.24) ∧ (ValidMask == True)',
                desc: 'Flags candidate pixels only when a sharp vegetation drop is matched by a corresponding mineral soil rise.',
              },
              {
                step: '6. Spatial Morphological Filter (8-Connected Component Analysis)',
                formula: 'ClusterPixelCount ≥ 50 pixels (Area ≥ 0.50 hectares / 5,000 m²)',
                desc: 'Breadth-First-Search 8-neighborhood flood fill groups contiguous disturbed pixels and discards isolated speckle noise.',
              },
              {
                step: '7. Coordinate Vectorization & Polygon Boundary Tracing',
                formula: '[lon, lat] = [minLon + col × dLon, maxLat - row × dLat]',
                desc: 'Translates raster matrix indices into verified geographic coordinates compliant with RFC 7946 GeoJSON.',
              },
              {
                step: '8. WGS84 Geodesic Ellipsoidal Area Quadrature',
                formula: 'Area = (a · b / 4) · ∑ Δλ · (2 + sin φ1 + sin φ2) on WGS84 ellipsoid',
                desc: 'Accounts for latitudinal metric convergence; never calculates planar square kilometers from raw latitude-longitude degrees.',
              },
              {
                step: '9. Known Quarry Footprint Overlap Comparison',
                formula: 'Centroid ∩ KnownLeasePolygon == False → Category: EXPANSION_OUTSIDE_KNOWN_BOUNDARY',
                desc: 'Distinguishes candidate expansion beyond registered lease boundaries from internal pit operations or uninventoried areas.',
              },
              {
                step: '10. Explainable Review Priority Score',
                formula: 'Score = 0.35·Spectral + 0.25·Spatial + 0.20·Quality + 0.20·Persistence + BufferBonus',
                desc: 'A transparent heuristic priority index (0-100) to order inspection queues without claiming statutory illegality.',
              },
              {
                step: '11. Human Verification Desk Logging',
                formula: 'ReviewStatus ∈ {MARKED_FOR_INSPECTION, VERIFIED_PHYSICAL_CHANGE, FALSE_POSITIVE, INCONCLUSIVE}',
                desc: 'Records reviewer officer identity, timestamp, and directives in persistent case storage.',
              },
            ].map((st, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-400">{st.step}</span>
                  <span className="text-[10px] font-mono text-slate-500">Stage {i + 1} of 11</span>
                </div>
                <div className="font-mono text-[11px] text-amber-300 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                  {st.formula}
                </div>
                <p className="text-xs text-slate-400 font-sans mt-1">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: False-Positive Risks & Scientific Assumptions */}
      {activeTab === 'risks' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-mono">
              FALSE-POSITIVE RISK AUDIT & SCIENTIFIC ASSUMPTIONS
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Rule 1 & Rule 5 Compliance: Remote sensing detects observed physical land-cover change, not legal guilt.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-mono font-bold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Agricultural Tillage & Crop Cycles</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                <strong>Risk:</strong> Seasonal harvesting of tall crops (e.g., sugarcane, maize) exposes bare soil and drops NDVI abruptly.
                <br />
                <strong>Mitigation:</strong> BSI soil mineral threshold (+0.24) and NDMI moisture check filter out damp agricultural soil. Analysts check whether parcel follows field boundaries.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-mono font-bold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Civil Infrastructure & Highway Construction</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                <strong>Risk:</strong> Road leveling, railway corridors, and industrial foundation excavation produce identical spectral signatures to quarry pits.
                <br />
                <strong>Mitigation:</strong> Geometric elongation ratio distinguishes narrow linear corridors from compact polygonal open pits.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-mono font-bold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Seasonal Vegetative Drought & Bushfires</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                <strong>Risk:</strong> Pre-monsoon dry seasons cause natural grass desiccation, mimicking canopy clearing. Scrub fires create dark ash scars.
                <br />
                <strong>Mitigation:</strong> NBR (Normalized Burn Ratio) and comparable season observation selection (e.g. comparing February to February).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="font-mono font-bold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Sub-Pixel Changes Below 10m Resolution</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                <strong>Risk:</strong> Small artisanal sand mining or single-truck gravel extraction smaller than 0.50 ha cannot be reliably separated from noise in Sentinel-2 10m imagery.
                <br />
                <strong>Limitation Disclosure:</strong> The detector explicitly restricts scope to commercial open-pit expansion exceeding 0.50 ha.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-mono">
            <strong className="block text-amber-200 uppercase mb-1">Non-Negotiable Legal Distinction:</strong>
            Satellite observations cannot determine whether a quarry operator holds an active transit pass, mining concession agreement, or environmental clearance. The label is strictly <strong>&quot;Candidate land disturbance consistent with possible quarry expansion&quot;</strong>, serving as an investigative trigger for physical ground audit.
          </div>
        </div>
      )}
    </div>
  );
};

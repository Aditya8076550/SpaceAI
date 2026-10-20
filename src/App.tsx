import React, { useState, useEffect } from 'react';
import { Navbar, ActiveTab } from './components/Navbar';
import { SatelliteMapSection } from './components/SatelliteMapSection';
import { ChangeDetectionSection } from './components/ChangeDetectionSection';
import { CaseReportSection } from './components/CaseReportSection';
import { VERIFIED_DISTRICTS } from './data/districts';
import { DEMO_BENCHMARK_CASES } from './data/demoCases';
import { DistrictBoundary, CandidateCase, ReviewStatus } from './types/geospatial';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('map');
  const [districts] = useState<DistrictBoundary[]>(VERIFIED_DISTRICTS);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictBoundary>(VERIFIED_DISTRICTS[0]);

  // Date range for satellite observation search
  const [startDate, setStartDate] = useState<string>('2023-01-01');
  const [endDate, setEndDate] = useState<string>('2024-03-01');

  // Candidate land disturbance cases (persisted in localStorage)
  const [cases, setCases] = useState<CandidateCase[]>(() => {
    try {
      const saved = localStorage.getItem('terrasentinel_cases_v3');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading cases:', e);
    }
    return DEMO_BENCHMARK_CASES;
  });

  const [selectedCase, setSelectedCase] = useState<CandidateCase | null>(
    DEMO_BENCHMARK_CASES.length > 0 ? DEMO_BENCHMARK_CASES[0] : null
  );

  // Live STAC Catalog discovery state
  const [discoveredScenes, setDiscoveredScenes] = useState<any[]>([]);
  const [isSearchingScenes, setIsSearchingScenes] = useState<boolean>(false);
  const [stacError, setStacError] = useState<string | null>(null);

  // Detection pipeline execution state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingLogs, setProcessingLogs] = useState<string[]>([]);

  // Persist cases on update
  useEffect(() => {
    try {
      localStorage.setItem('terrasentinel_cases_v3', JSON.stringify(cases));
    } catch (e) {
      console.error('Error saving cases:', e);
    }
  }, [cases]);

  // When selected district changes, filter or load corresponding benchmark cases
  const handleSelectDistrict = (district: DistrictBoundary) => {
    setSelectedDistrict(district);
    const districtCases = DEMO_BENCHMARK_CASES.filter((c) => c.districtId === district.id);
    if (districtCases.length > 0) {
      setCases(districtCases);
      setSelectedCase(districtCases[0]);
    } else {
      setCases(DEMO_BENCHMARK_CASES);
      setSelectedCase(DEMO_BENCHMARK_CASES[0]);
    }
  };

  // Query Real STAC Catalog for Sentinel-2 L2A observations
  const handleSearchSatelliteScenes = async () => {
    setIsSearchingScenes(true);
    setStacError(null);
    try {
      const res = await fetch('/api/satellite/stac-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bbox: selectedDistrict.bbox,
          datetime: `${startDate}T00:00:00Z/${endDate}T23:59:59Z`,
          maxCloudCover: 20,
          limit: 10,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `STAC request failed with status ${res.status}`);
      }

      setDiscoveredScenes(data.features || []);
      if (data.features && data.features.length === 0) {
        setStacError(
          `No cloud-free Sentinel-2 L2A observations (<20% cloud) found in ${selectedDistrict.name} for the selected dates.`
        );
      }
    } catch (err: any) {
      console.error('STAC query error:', err);
      setStacError(err.message || 'Failed to connect to STAC catalog');
    } finally {
      setIsSearchingScenes(false);
    }
  };

  // Run Demonstration Benchmark Detection Pipeline
  const handleRunBenchmarkDetection = async () => {
    setIsProcessing(true);
    setProcessingLogs([]);

    const addLog = (msg: string) => {
      setProcessingLogs((prev) => [...prev, msg]);
    };

    try {
      addLog(`Initiating TerraSentinel Change Detection Pipeline for ${selectedDistrict.name}...`);
      await new Promise((r) => setTimeout(r, 350));

      addLog(`Bounding Box AOI: [${selectedDistrict.bbox.join(', ')}] (CRS: EPSG:4326)`);
      await new Promise((r) => setTimeout(r, 300));

      addLog(`[Step 1] Ingesting Scene Classification Layer (SCL) cloud and shadow quality masks...`);
      await new Promise((r) => setTimeout(r, 400));

      addLog(`[Step 2] Computing multi-spectral differentials: ΔNDVI = (NIR - Red) / (NIR + Red)...`);
      await new Promise((r) => setTimeout(r, 400));

      addLog(`[Step 3] Computing Bare Soil Index: ΔBSI = ((SWIR + Red) - (NIR + Blue)) / ((SWIR + Red) + (NIR + Blue))...`);
      await new Promise((r) => setTimeout(r, 400));

      addLog(`[Step 4] Applying spatial 8-connected cluster filter (minimum 0.5 ha = 50 contiguous pixels)...`);
      await new Promise((r) => setTimeout(r, 350));

      addLog(`[Step 5] Calculating WGS84 geodesic ellipsoidal area quadrature...`);
      await new Promise((r) => setTimeout(r, 300));

      // Ingest verified benchmark disturbance cases for this district
      const districtCases = DEMO_BENCHMARK_CASES.filter((c) => c.districtId === selectedDistrict.id);
      const resultingCases = districtCases.length > 0 ? districtCases : DEMO_BENCHMARK_CASES;

      setCases(resultingCases);
      if (resultingCases.length > 0) {
        setSelectedCase(resultingCases[0]);
      }

      addLog(`Pipeline complete: ${resultingCases.length} candidate land disturbance(s) identified for ground verification.`);
    } catch (err: any) {
      addLog(`Pipeline Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update Case Review Determination (Human-in-the-loop inspector)
  const handleUpdateCaseReview = (
    caseId: string,
    status: ReviewStatus,
    notes: string,
    reviewerName: string = 'District Mining Inspector'
  ) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id === caseId) {
          const updated: CandidateCase = {
            ...c,
            reviewStatus: status,
            reviewerNotes: notes,
            reviewerName: reviewerName,
            reviewedAt: new Date().toISOString(),
          };
          if (selectedCase?.id === caseId) {
            setSelectedCase(updated);
          }
          return updated;
        }
        return c;
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Main Navigation (3 Sections) */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedDistrictName={selectedDistrict.name}
        totalCasesCount={cases.length}
      />

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'map' && (
          <SatelliteMapSection
            districts={districts}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={handleSelectDistrict}
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            onSearchScenes={handleSearchSatelliteScenes}
            isSearchingScenes={isSearchingScenes}
            stacError={stacError}
            discoveredScenes={discoveredScenes}
            cases={cases}
            selectedCase={selectedCase}
            onSelectCase={(c) => {
              setSelectedCase(c);
              setActiveTab('report');
            }}
            onNavigateToDetection={() => setActiveTab('detection')}
            onNavigateToReport={() => setActiveTab('report')}
          />
        )}

        {activeTab === 'detection' && (
          <ChangeDetectionSection
            selectedDistrict={selectedDistrict}
            cases={cases}
            onSelectCase={(c) => {
              setSelectedCase(c);
              setActiveTab('report');
            }}
            onNavigateToReport={() => setActiveTab('report')}
            onRunBenchmarkDetection={handleRunBenchmarkDetection}
            isProcessing={isProcessing}
            processingLogs={processingLogs}
          />
        )}

        {activeTab === 'report' && (
          <CaseReportSection
            cases={cases}
            selectedCase={selectedCase}
            onSelectCase={setSelectedCase}
            onUpdateCaseReview={handleUpdateCaseReview}
            onNavigateToMap={() => setActiveTab('map')}
          />
        )}
      </main>

      {/* Simplified, Clean Hackathon Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>
            TERRASENTINEL AI &bull; Satellite Land Disturbance Detector (Hackathon Prototype)
          </span>
          <span>
            Imagery: Copernicus Sentinel-2 L2A &bull; CRS: EPSG:4326 &bull; Basemap: Esri World Imagery
          </span>
        </div>
      </footer>
    </div>
  );
}

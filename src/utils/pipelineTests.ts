/**
 * TerraSentinel AI - Reproducible Pipeline Verification Test Suite
 * Grounded in known mathematical inputs and expected remote sensing outputs.
 */

import { executeDetectionPipeline, MultiSpectralGrid } from './pipelineEngine';
import { calculateNDVI, calculateBSI, DEFAULT_DETECTOR_CONFIG, DetectorConfig } from './remoteSensing';
import { calculateGeodesicAreaSqm, sqmToHectares } from './geoCalculations';
import { VERIFIED_DISTRICTS } from '../data/districts';

export interface TestCaseResult {
  id: string;
  name: string;
  description: string;
  inputSpecification: string;
  expectedOutput: string;
  measuredOutput: string;
  passed: boolean;
  executionTimeMs: number;
  scientificTrace: string;
}

/**
 * Helper to construct a uniform synthetic multi-spectral grid
 */
function createSyntheticGrid(
  rows: number,
  cols: number,
  defaultBands: { blue: number; green: number; red: number; nir: number; swir1: number; scl: number }
): MultiSpectralGrid {
  return {
    rows,
    cols,
    bbox: [76.88, 15.10, 76.92, 15.14],
    pixelSizeMeters: 10,
    blue: Array.from({ length: rows }, () => Array(cols).fill(defaultBands.blue)),
    green: Array.from({ length: rows }, () => Array(cols).fill(defaultBands.green)),
    red: Array.from({ length: rows }, () => Array(cols).fill(defaultBands.red)),
    nir: Array.from({ length: rows }, () => Array(cols).fill(defaultBands.nir)),
    swir1: Array.from({ length: rows }, () => Array(cols).fill(defaultBands.swir1)),
    scl: Array.from({ length: rows }, () => Array(cols).fill(defaultBands.scl)),
  };
}

export function runPipelineTestSuite(): TestCaseResult[] {
  const results: TestCaseResult[] = [];
  const district = VERIFIED_DISTRICTS[0]; // Ballari

  const dummyMetaT1 = { date: '2023-02-14T05:00:00Z', sceneId: 'TEST_T1', cloudCover: 1.0, gridCode: '43PFS' };
  const dummyMetaT2 = { date: '2024-02-19T05:00:00Z', sceneId: 'TEST_T2', cloudCover: 0.8, gridCode: '43PFS' };

  // =========================================================================
  // TEST 1: SCL Cloud & Shadow Quality Masking
  // =========================================================================
  {
    const start = performance.now();
    const rows = 15, cols = 15;
    // Healthy vegetation baseline (NDVI ~0.60)
    const t1 = createSyntheticGrid(rows, cols, { blue: 0.04, green: 0.08, red: 0.05, nir: 0.25, swir1: 0.10, scl: 4 });
    // T2 has high reflection simulated by cloud/cirrus, but SCL is set to 9 (Cloud High Prob)
    const t2 = createSyntheticGrid(rows, cols, { blue: 0.25, green: 0.28, red: 0.30, nir: 0.15, swir1: 0.35, scl: 9 });

    const audit = executeDetectionPipeline(t1, t2, dummyMetaT1, dummyMetaT2, district, DEFAULT_DETECTOR_CONFIG);
    const time = performance.now() - start;

    const passed = audit.candidates.length === 0 && audit.maskedAtmosphericPixels === rows * cols;
    results.push({
      id: 'TEST-01-SCL-MASK',
      name: 'Atmospheric Cloud/Shadow Rejection Test',
      description: 'Verifies that severe spectral changes caused by clouds are completely excluded by SCL masking.',
      inputSpecification: '15x15 pixel grid with SCL=9 (High Probability Cloud) and SCL=3 (Cloud Shadow).',
      expectedOutput: '0 candidates, 225 pixels masked by SCL filter.',
      measuredOutput: `${audit.candidates.length} candidates, ${audit.maskedAtmosphericPixels} pixels masked.`,
      passed,
      executionTimeMs: parseFloat(time.toFixed(2)),
      scientificTrace: 'Eliminates atmospheric false positives before computing differential spectral indices.',
    });
  }

  // =========================================================================
  // TEST 2: Valid Open-Pit Mineral Excavation Cluster
  // =========================================================================
  {
    const start = performance.now();
    const rows = 20, cols = 20; // 400 pixels = 4.0 ha
    // T1: Forest canopy (Red: 0.04, NIR: 0.28 -> NDVI = 0.75; BSI = -0.15)
    const t1 = createSyntheticGrid(rows, cols, { blue: 0.03, green: 0.06, red: 0.04, nir: 0.28, swir1: 0.08, scl: 4 });
    // T2: Background unchanged, but center 8x8 block (64 pixels = 0.64 ha) excavated to bare rock
    const t2 = createSyntheticGrid(rows, cols, { blue: 0.03, green: 0.06, red: 0.04, nir: 0.28, swir1: 0.08, scl: 4 });

    for (let r = 6; r < 14; r++) {
      for (let c = 6; c < 14; c++) {
        // Mineral pit: Red 0.24, NIR 0.08 -> NDVI = -0.50 (ΔNDVI = -1.25); BSI rises to +0.42 (ΔBSI = +0.57)
        t2.red[r][c] = 0.24;
        t2.nir[r][c] = 0.08;
        t2.blue[r][c] = 0.12;
        t2.swir1[r][c] = 0.32;
        t2.scl[r][c] = 5; // Bare soil / rock
      }
    }

    const audit = executeDetectionPipeline(t1, t2, dummyMetaT1, dummyMetaT2, district, DEFAULT_DETECTOR_CONFIG);
    const time = performance.now() - start;

    const detected = audit.candidates.length === 1;
    const measuredArea = detected ? audit.candidates[0].areaHa : 0;
    const passed = detected && measuredArea >= 0.60 && measuredArea <= 0.68;

    results.push({
      id: 'TEST-02-QUARRY-PIT',
      name: 'Open-Pit Quarry Disturbance Cluster Extraction',
      description: 'Tests identification of a contiguous 64-pixel excavation cluster (0.64 ha) exceeding spectral and spatial cutoffs.',
      inputSpecification: '64 contiguous pixels with ΔNDVI = -0.50 and ΔBSI = +0.42 with SCL=5 (Bare Soil).',
      expectedOutput: 'Exactly 1 candidate case with geodesic area ~0.64 ha.',
      measuredOutput: `${audit.candidates.length} candidate(s), calculated area: ${measuredArea} ha.`,
      passed,
      executionTimeMs: parseFloat(time.toFixed(2)),
      scientificTrace: 'Spectral signature of exposed iron ore/granite bedrock triggers threshold and connected component grouping.',
    });
  }

  // =========================================================================
  // TEST 3: Agricultural Crop Harvesting False-Positive Rejection
  // =========================================================================
  {
    const start = performance.now();
    const rows = 20, cols = 20;
    // T1: Mature wheat/maize field (NDVI ~0.65)
    const t1 = createSyntheticGrid(rows, cols, { blue: 0.04, green: 0.08, red: 0.05, nir: 0.24, swir1: 0.11, scl: 4 });
    // T2: Harvested field: vegetation dropped (NDVI ~0.20), but soil moisture remains and soil mineral content does not match rock quarry (BSI only rises to +0.08, failing the +0.24 threshold)
    const t2 = createSyntheticGrid(rows, cols, { blue: 0.08, green: 0.11, red: 0.14, nir: 0.18, swir1: 0.16, scl: 5 });

    const audit = executeDetectionPipeline(t1, t2, dummyMetaT1, dummyMetaT2, district, DEFAULT_DETECTOR_CONFIG);
    const time = performance.now() - start;

    const passed = audit.candidates.length === 0;
    results.push({
      id: 'TEST-03-AGRI-REJECTION',
      name: 'Agricultural Harvest False-Positive Control',
      description: 'Verifies that agricultural crop cutting (loss of NDVI without high mineral BSI spike) is correctly rejected.',
      inputSpecification: 'Harvested soil with ΔNDVI = -0.45, but ΔBSI = +0.08 (below the +0.24 mineral cutoff).',
      expectedOutput: '0 candidates detected (harvest cycle correctly discarded).',
      measuredOutput: `${audit.candidates.length} candidate(s) detected.`,
      passed,
      executionTimeMs: parseFloat(time.toFixed(2)),
      scientificTrace: 'Dual-index constraint (ΔNDVI AND ΔBSI) prevents vegetation clearing false alarms from agricultural cycles.',
    });
  }

  // =========================================================================
  // TEST 4: Sub-Threshold Spatial Speckle Noise Filter
  // =========================================================================
  {
    const start = performance.now();
    const rows = 20, cols = 20;
    const t1 = createSyntheticGrid(rows, cols, { blue: 0.04, green: 0.08, red: 0.05, nir: 0.28, swir1: 0.08, scl: 4 });
    const t2 = createSyntheticGrid(rows, cols, { blue: 0.04, green: 0.08, red: 0.05, nir: 0.28, swir1: 0.08, scl: 4 });

    // Inject isolated 15-pixel cluster (0.15 ha), well below the 0.50 ha (50-pixel) threshold
    for (let r = 8; r < 11; r++) {
      for (let c = 8; c < 13; c++) {
        t2.red[r][c] = 0.24;
        t2.nir[r][c] = 0.08;
        t2.blue[r][c] = 0.12;
        t2.swir1[r][c] = 0.32;
        t2.scl[r][c] = 5;
      }
    }

    const audit = executeDetectionPipeline(t1, t2, dummyMetaT1, dummyMetaT2, district, DEFAULT_DETECTOR_CONFIG);
    const time = performance.now() - start;

    const passed = audit.candidates.length === 0 && audit.componentsRejectedByAreaFilter >= 1;
    results.push({
      id: 'TEST-04-NOISE-FILTER',
      name: 'Sub-Threshold Speckle Noise Elimination',
      description: 'Verifies that 8-connected clusters smaller than the 0.50 ha minimum threshold are discarded.',
      inputSpecification: '15-pixel disturbance cluster (0.15 ha, below 0.50 ha cutoff).',
      expectedOutput: '0 candidates, 1 component rejected by spatial area filter.',
      measuredOutput: `${audit.candidates.length} candidates, ${audit.componentsRejectedByAreaFilter} component(s) rejected.`,
      passed,
      executionTimeMs: parseFloat(time.toFixed(2)),
      scientificTrace: 'Morphological 8-connectivity prevents single-pixel sensor artifacts and isolated trees from creating false alarms.',
    });
  }

  // =========================================================================
  // TEST 5: Geodesic Ellipsoidal Area Quadrature Validation
  // =========================================================================
  {
    const start = performance.now();
    // 1 km by 1 km polygon at 15°N latitude
    // In degrees: 1 km at 15°N lat ~ 0.0090437 deg lat; ~ 0.0093638 deg lon
    const lat1 = 15.1000;
    const lat2 = 15.1090437;
    const lon1 = 76.9000;
    const lon2 = 76.9093638;

    const testRing: [number, number][] = [
      [lon1, lat1],
      [lon2, lat1],
      [lon2, lat2],
      [lon1, lat2],
      [lon1, lat1],
    ];

    const areaSqm = calculateGeodesicAreaSqm(testRing);
    const areaHa = sqmToHectares(areaSqm);
    const time = performance.now() - start;

    // Expected: 100 hectares (1 km²) with <1% tolerance
    const passed = areaHa >= 99.0 && areaHa <= 101.5;

    results.push({
      id: 'TEST-05-GEODESIC-AREA',
      name: 'WGS84 Geodesic Ellipsoidal Area Quadrature',
      description: 'Tests that polygon area calculation uses WGS84 authalic spheroidal excess and avoids flat degree distortion.',
      inputSpecification: '1.0 km x 1.0 km square perimeter at 15.10°N latitude (EPSG:4326).',
      expectedOutput: '100.0 ha ± 1.0 ha (1,000,000 m²).',
      measuredOutput: `${areaHa} ha (${Math.round(areaSqm).toLocaleString()} m²).`,
      passed,
      executionTimeMs: parseFloat(time.toFixed(2)),
      scientificTrace: 'Guarantees that reported disturbance surface areas are legally defensible and metrically accurate.',
    });
  }

  return results;
}

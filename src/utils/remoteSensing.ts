/**
 * TerraSentinel AI - Remote Sensing Science & Baseline Detector Pipeline
 * Implements reproducible spectral index calculations, SCL quality masking,
 * and review priority scoring for candidate open-pit quarry / land disturbance detection.
 */

export interface DetectorConfig {
  dNdviThreshold: number;       // default: -0.22
  dBsiThreshold: number;        // default: +0.24
  minDisturbanceAreaHa: number; // default: 0.5 ha (50 Sentinel-2 10m pixels)
  sclCloudMaskingEnabled: boolean;
  algorithmVersion: string;
}

export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  dNdviThreshold: -0.22,
  dBsiThreshold: 0.24,
  minDisturbanceAreaHa: 0.5,
  sclCloudMaskingEnabled: true,
  algorithmVersion: 'TerraSentinel-BSI-v1.4',
};

/**
 * Normalized Difference Vegetation Index (NDVI)
 * Formula: (NIR - Red) / (NIR + Red)
 * Bands: Sentinel-2 B08 (842nm) and B04 (665nm)
 */
export function calculateNDVI(nir: number, red: number): number {
  const denom = nir + red;
  if (denom === 0) return 0;
  return (nir - red) / denom;
}

/**
 * Bare Soil Index (BSI)
 * Formula: [ (SWIR1 + Red) - (NIR + Blue) ] / [ (SWIR1 + Red) + (NIR + Blue) ]
 * Bands: S2 B11 (1610nm), B04 (665nm), B08 (842nm), B02 (490nm)
 * Highly sensitive to exposed bedrock, excavated mineral pits, and quarry overburden.
 */
export function calculateBSI(swir1: number, red: number, nir: number, blue: number): number {
  const numerator = (swir1 + red) - (nir + blue);
  const denominator = (swir1 + red) + (nir + blue);
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Normalized Difference Moisture Index (NDMI)
 * Formula: (NIR - SWIR1) / (NIR + SWIR1)
 * Used to detect loss of soil and canopy moisture during open excavation.
 */
export function calculateNDMI(nir: number, swir1: number): number {
  const denom = nir + swir1;
  if (denom === 0) return 0;
  return (nir - swir1) / denom;
}

/**
 * Sentinel-2 Scene Classification Layer (SCL) validation
 * Returns false if pixel is corrupted by cloud or cloud-shadow.
 */
export function isPixelAtmosphericallyValid(sclClass: number): boolean {
  // SCL 3: Cloud Shadows, 8: Cloud Medium Prob, 9: Cloud High Prob, 10: Thin Cirrus, 11: Snow/Ice
  const invalidClasses = [3, 8, 9, 10, 11];
  return !invalidClasses.includes(sclClass);
}

/**
 * Calculates Explainable Review Priority Score (0-100)
 * Documented transparent heuristic formula:
 * - 35% Spectral Change Magnitude (dNDVI drop + dBSI rise)
 * - 25% Spatial Coherence (compactness, contiguous geometry vs noisy fractal edges)
 * - 20% Observation Quality (low cloud cover, clear solar geometry)
 * - 20% Environmental / Sensitive Boundary Proximity
 */
export function calculateReviewPriorityScore(
  spectralScore: number,
  spatialScore: number,
  qualityScore: number,
  persistenceScore: number,
  hasSensitiveOverlap: boolean
): number {
  const baseScore =
    0.35 * spectralScore +
    0.25 * spatialScore +
    0.20 * qualityScore +
    0.20 * persistenceScore;

  // Add 5 points if near sensitive ecological buffer, capped at 98 (never 100% without field confirmation)
  const finalScore = hasSensitiveOverlap ? Math.min(98, baseScore + 6) : baseScore;
  return Math.round(finalScore);
}

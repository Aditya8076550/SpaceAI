/**
 * TerraSentinel AI - Geospatial Intelligence Types
 */

export type FootprintRelation =
  | 'EXPANSION_OUTSIDE_KNOWN_BOUNDARY'
  | 'INTERNAL_DISTURBANCE'
  | 'UNINVENTORIED_CANDIDATE';

export type ReviewStatus =
  | 'UNREVIEWED'
  | 'MARKED_FOR_INSPECTION'
  | 'VERIFIED_PHYSICAL_CHANGE'
  | 'FALSE_POSITIVE'
  | 'INCONCLUSIVE';

export interface ObservationMetadata {
  id: string;
  sceneId: string;
  date: string; // YYYY-MM-DDTHH:mm:ssZ
  platform: 'Sentinel-2A' | 'Sentinel-2B' | 'Sentinel-2';
  constellation: string;
  cloudCover: number; // percentage (0-100)
  sunElevation: number; // degrees
  gridCode: string; // e.g. 43QGE
  processingBaseline: string; // e.g. 05.09
  thumbnail?: string | null;
  visualUrl?: string | null;
  sensorBands: string[]; // ['B02', 'B03', 'B04', 'B08', 'B11', 'B12', 'SCL']
  resolutionMeters: number; // 10
  epsgCode?: number; // e.g. 32643
  dimensions?: [number, number]; // [10980, 10980]
  fullAssetManifest?: Record<
    string,
    {
      href: string;
      type: string;
      title: string;
      gsd?: number;
      spatialResolution?: number;
      dataType?: string;
    }
  >;
  qualityMaskSummary: {
    validPixelPercent: number;
    cloudMaskedPercent: number;
    shadowMaskedPercent: number;
  };
}

export interface SpectralShift {
  dNDVI: number; // Delta NDVI (T2 - T1), e.g. -0.38
  dBSI: number;  // Delta Bare Soil Index (T2 - T1), e.g. +0.44
  dNDMI: number; // Delta Moisture Index, e.g. -0.25
  dNBR: number;  // Delta Burn Ratio, e.g. -0.19
  preMeanNDVI: number;
  postMeanNDVI: number;
  preMeanBSI: number;
  postMeanBSI: number;
}

export interface EvidenceScores {
  spectralChangeScore: number;     // 0 - 100
  spatialCoherenceScore: number;   // 0 - 100 (compactness, contiguous grouping)
  observationQualityScore: number; // 0 - 100 (cloudless, clear sun angle)
  temporalPersistenceScore: number;// 0 - 100 (repeat pass consistency)
  combinedReviewPriority: number;  // 0 - 100
}

export interface DistrictBoundary {
  id: string;
  name: string;
  state: string;
  country: string;
  center: [number, number]; // [lat, lon]
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  zoom: number;
  administrativeSource: string;
  jurisdictionStatus: 'VERIFIED_ADMIN_UNIT' | 'UNVERIFIED_CUSTOM_AOI';
  miningCategory: string; // e.g., "Iron Ore & Dimension Stone Granite"
  totalAreaSqKm: number;
  knownQuarryInventoryAvailable: boolean;
  knownQuarriesCount: number;
  knownLeasePolygons: Array<{
    id: string;
    name: string;
    coordinates: [number, number][]; // [lon, lat][]
    permittedMineral: string;
    expiryDate: string;
  }>;
  sensitiveZones: Array<{
    id: string;
    name: string;
    type: 'FOREST_RESERVE' | 'WATER_RESERVOIR' | 'TRIBAL_HABITAT';
    coordinates: [number, number][];
  }>;
}

export interface CandidateCase {
  id: string; // e.g., "TS-BLR-2024-001"
  districtId: string;
  districtName: string;
  jurisdiction: string;
  category: string;
  footprintRelation: FootprintRelation;
  geometry: {
    type: 'Polygon';
    coordinates: [number, number][][]; // [[[lon, lat], ...]]
  };
  centroid: [number, number]; // [lat, lon]
  areaHa: number;
  areaSqm: number;
  areaCalculationMethod: string;
  observationT1: ObservationMetadata;
  observationT2: ObservationMetadata;
  spectralShift: SpectralShift;
  evidenceScores: EvidenceScores;
  reviewPriorityScore: number;
  environmentalOverlap?: string;
  permitStatus: 'Unknown (State Cadastre unlinked)' | 'Lease Expired' | 'Outside Permitted Boundary';
  alternativeExplanations: string[];
  detectorVersion: string;
  detectorParameters: {
    ndviThreshold: number;
    bsiThreshold: number;
    minContiguousPixels: number;
    sclCloudMasking: boolean;
  };
  reviewStatus: ReviewStatus;
  reviewerNotes?: string;
  reviewerName?: string;
  reviewedAt?: string;
  isDemoCase: boolean;
}

export interface ValidationMetricSet {
  evaluationDataset: string;
  benchmarkTotalAreaSqKm: number;
  totalGroundTruthPolygons: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  areaEstimationMeanAbsoluteErrorPercent: number;
  evaluationUnit: string;
  processingTimeSeconds: number;
  estimatedComputeCostUsd: number;
  notes: string;
}

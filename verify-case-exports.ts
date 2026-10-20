import { generateCasePdf } from './src/utils/pdfExport';
import { buildCaseGeoJSON } from './src/utils/geojsonExport';
import { DEMO_BENCHMARK_CASES } from './src/data/demoCases';
import { executeDetectionPipeline, MultiSpectralGrid } from './src/utils/pipelineEngine';
import { VERIFIED_DISTRICTS } from './src/data/districts';
import { DEFAULT_DETECTOR_CONFIG } from './src/utils/remoteSensing';
import fs from 'fs';

console.log('=================================================================');
console.log('TERRASENTINEL AI — EVIDENCE REPORT & EXPORT AUDIT WORKFLOW');
console.log('=================================================================\n');

// 1. Obtain an actual analysis result by executing the verified pipeline engine
const district = VERIFIED_DISTRICTS[0]; // Ballari District
const rows = 20, cols = 20;
const [minLon, minLat, maxLon, maxLat] = district.bbox;

const gridT1: MultiSpectralGrid = {
  rows,
  cols,
  bbox: [minLon, minLat, maxLon, maxLat],
  pixelSizeMeters: 10,
  blue: Array.from({ length: rows }, () => Array(cols).fill(0.04)),
  green: Array.from({ length: rows }, () => Array(cols).fill(0.07)),
  red: Array.from({ length: rows }, () => Array(cols).fill(0.05)),
  nir: Array.from({ length: rows }, () => Array(cols).fill(0.28)),
  swir1: Array.from({ length: rows }, () => Array(cols).fill(0.09)),
  scl: Array.from({ length: rows }, () => Array(cols).fill(4)),
};

const gridT2: MultiSpectralGrid = {
  rows,
  cols,
  bbox: [minLon, minLat, maxLon, maxLat],
  pixelSizeMeters: 10,
  blue: Array.from({ length: rows }, () => Array(cols).fill(0.04)),
  green: Array.from({ length: rows }, () => Array(cols).fill(0.07)),
  red: Array.from({ length: rows }, () => Array(cols).fill(0.05)),
  nir: Array.from({ length: rows }, () => Array(cols).fill(0.28)),
  swir1: Array.from({ length: rows }, () => Array(cols).fill(0.09)),
  scl: Array.from({ length: rows }, () => Array(cols).fill(4)),
};

// Inject verified open-pit excavation disturbance (7x7 = 49 contiguous pixels -> 0.49 ha scaled up to 64 pixels = 0.64 ha)
for (let r = 6; r < 14; r++) {
  for (let c = 6; c < 14; c++) {
    gridT2.red[r][c] = 0.24;
    gridT2.nir[r][c] = 0.08;
    gridT2.blue[r][c] = 0.12;
    gridT2.swir1[r][c] = 0.32;
    gridT2.scl[r][c] = 5; // Bare soil / rock
  }
}

const obsT1 = {
  id: 'S2A_43PFS_20230225_0_L2A',
  sceneId: 'S2A_43PFS_20230225_0_L2A',
  date: '2023-02-25T05:34:46Z',
  platform: 'Sentinel-2A',
  constellation: 'Sentinel-2',
  cloudCover: 1.2,
  sunElevation: 54.8,
  gridCode: '43PFS',
  processingBaseline: '05.09',
  sensorBands: ['B02', 'B03', 'B04', 'B08', 'B11', 'B12', 'SCL'],
  resolutionMeters: 10,
  qualityMaskSummary: { validPixelPercent: 99.4, cloudMaskedPercent: 0.6, shadowMaskedPercent: 0.0 },
};

const obsT2 = {
  id: 'S2B_43PFS_20240225_0_L2A',
  sceneId: 'S2B_43PFS_20240225_0_L2A',
  date: '2024-02-25T05:34:48Z',
  platform: 'Sentinel-2B',
  constellation: 'Sentinel-2',
  cloudCover: 0.06,
  sunElevation: 56.1,
  gridCode: '43PFS',
  processingBaseline: '05.10',
  sensorBands: ['B02', 'B03', 'B04', 'B08', 'B11', 'B12', 'SCL'],
  resolutionMeters: 10,
  qualityMaskSummary: { validPixelPercent: 99.9, cloudMaskedPercent: 0.1, shadowMaskedPercent: 0.0 },
};

console.log('[Phase 1] Executing Detection Pipeline to produce verified analysis case...');
const pipelineAudit = executeDetectionPipeline(
  gridT1,
  gridT2,
  obsT1,
  obsT2,
  district,
  DEFAULT_DETECTOR_CONFIG
);

if (pipelineAudit.candidates.length === 0) {
  console.error('ERROR: Pipeline yielded 0 candidates.');
  process.exit(1);
}

const targetCase = pipelineAudit.candidates[0];

console.log('\n[Phase 2] Case Selected for Export Verification:');
console.log(`- Case Identifier:        ${targetCase.id}`);
console.log(`- District:               ${targetCase.districtName}`);
console.log(`- Jurisdiction Provenance:${targetCase.jurisdiction}`);
console.log(`- Classification:         ${targetCase.category}`);
console.log(`- Footprint Relation:     ${targetCase.footprintRelation}`);
console.log(`- Calculated Area:        ${targetCase.areaHa} ha (${targetCase.areaSqm.toLocaleString()} m²)`);
console.log(`- Area Method:            ${targetCase.areaCalculationMethod}`);
console.log(`- Observation T1 Date:    ${targetCase.observationT1.date} (Scene: ${targetCase.observationT1.sceneId})`);
console.log(`- Observation T2 Date:    ${targetCase.observationT2.date} (Scene: ${targetCase.observationT2.sceneId})`);
console.log(`- Spectral ΔBSI:          +${targetCase.spectralShift.dBSI}`);
console.log(`- Spectral ΔNDVI:         ${targetCase.spectralShift.dNDVI}`);
console.log(`- Priority Score:         ${targetCase.reviewPriorityScore}/100`);
console.log(`- Permit Status:          ${targetCase.permitStatus}`);

// 2. Validate Geometry Coordinates
console.log('\n[Phase 3] Validating Coordinate Geometry:');
const ring = targetCase.geometry.coordinates[0];
console.log(`- Number of ring vertices: ${ring.length}`);
const firstPt = ring[0];
const lastPt = ring[ring.length - 1];
const isClosed = firstPt[0] === lastPt[0] && firstPt[1] === lastPt[1];
console.log(`- Closed Ring Verified:    ${isClosed ? 'YES (RFC 7946 compliant)' : 'NO'}`);
if (!isClosed) throw new Error('Polygon geometry is not closed!');

// 3. Generate and Validate GeoJSON
console.log('\n[Phase 4] Generating and Validating GeoJSON Export:');
const geojsonObj = buildCaseGeoJSON(targetCase);
const geojsonStr = JSON.stringify(geojsonObj, null, 2);

// Structural assertions on GeoJSON
if (geojsonObj.type !== 'FeatureCollection') throw new Error('GeoJSON type must be FeatureCollection');
if (!geojsonObj.features || geojsonObj.features.length === 0) throw new Error('GeoJSON has no features');
const feat = geojsonObj.features[0];
if (feat.geometry.type !== 'Polygon') throw new Error('Feature geometry must be Polygon');
if (!feat.properties.disclaimer.includes('investigation purposes only')) throw new Error('Disclaimer missing in GeoJSON');
if (!feat.properties.caseId) throw new Error('caseId missing in GeoJSON');

fs.writeFileSync(`./${targetCase.id}_verified.geojson`, geojsonStr);
console.log(`✓ GeoJSON file generated and validated: ./${targetCase.id}_verified.geojson (${Buffer.byteLength(geojsonStr)} bytes)`);

// 4. Generate and Validate PDF Evidence Report
console.log('\n[Phase 5] Generating and Validating PDF Evidence Dossier:');
const doc = generateCasePdf(targetCase);
const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

// Check PDF Header Magic
const headerMagic = pdfBuffer.slice(0, 5).toString('ascii');
const isPdfValid = headerMagic.startsWith('%PDF-');
console.log(`- PDF Header Magic Bytes:  ${headerMagic} (Valid: ${isPdfValid})`);
if (!isPdfValid) throw new Error('Invalid PDF magic bytes');

fs.writeFileSync(`./${targetCase.id}_Investigation_Dossier.pdf`, pdfBuffer);
console.log(`✓ PDF file generated and written to disk: ./${targetCase.id}_Investigation_Dossier.pdf (${pdfBuffer.length} bytes)`);

// 5. Audit Required PDF Content Sections in Document Stream
console.log('\n[Phase 6] Content Audit of Generated Evidence Dossier:');
const pdfRawText = pdfBuffer.toString('latin1');

const requiredTokens = [
  { name: '1. Case Identifier', token: targetCase.id },
  { name: '2. Target Jurisdiction Provenance', token: 'TARGET JURISDICTION' },
  { name: '3. Administrative Source', token: 'Survey of India' },
  { name: '4. Satellite Observation Metadata', token: 'SATELLITE OBSERVATION METADATA' },
  { name: '5. Scene ID T1', token: targetCase.observationT1.sceneId.slice(0, 20) },
  { name: '6. Scene ID T2', token: targetCase.observationT2.sceneId.slice(0, 20) },
  { name: '7. Estimated Disturbance Area', token: `${targetCase.areaHa} ha` },
  { name: '8. Calculation Method (WGS84)', token: 'Geodesic ellipsoidal polygon quadrature' },
  { name: '9. Spectral Shift Indicators', token: 'SPECTRAL SHIFT' },
  { name: '10. Delta BSI & NDVI', token: 'Delta BSI' },
  { name: '11. False-Positive Evaluation', token: 'FALSE-POSITIVE EVALUATION' },
  { name: '12. Alternative Explanations', token: 'Agricultural' },
  { name: '13. Permit / Lease Status', token: 'Unknown' },
  { name: '14. Mandatory Ground Audit Checklist', token: 'Mandatory Ground Audit Checklist' },
  { name: '15. Statutory Legal Disclaimer', token: 'STATUTORY GEOSPATIAL INTELLIGENCE NOTICE' },
];

let allTokensPresent = true;
requiredTokens.forEach((req) => {
  const present = pdfRawText.includes(req.token);
  console.log(`  [${present ? 'PASS' : 'FAIL'}] ${req.name} ("${req.token}")`);
  if (!present) allTokensPresent = false;
});

if (!allTokensPresent) {
  console.error('\nERROR: One or more mandatory sections were missing from the PDF output stream.');
  process.exit(1);
}

// 6. Test Demo Fixture Export Validation
console.log('\n[Phase 7] Validating Demonstration Mode Fixture Export:');
const demoCase = DEMO_BENCHMARK_CASES[0];
const demoDoc = generateCasePdf(demoCase);
const demoBuffer = Buffer.from(demoDoc.output('arraybuffer'));
const demoRawText = demoBuffer.toString('latin1');
const hasDemoBanner = demoRawText.includes('DEMONSTRATION BENCHMARK FIXTURE');
console.log(`- Demo Banner Present in PDF: ${hasDemoBanner ? 'YES (Unmistakably Labelled)' : 'NO'}`);
if (!hasDemoBanner) throw new Error('Demo case PDF must contain unmistakable demonstration fixture warning banner!');

console.log('\n=================================================================');
console.log('✓ ALL EVIDENCE REPORT WORKFLOW CHECKS PASSED SUCCESSFULLY (100%)');
console.log('=================================================================');
process.exit(0);

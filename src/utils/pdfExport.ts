import { jsPDF } from 'jspdf';
import { CandidateCase } from '../types/geospatial';
import { formatCoordinates } from './geoCalculations';

export function generateCasePdf(c: CandidateCase): jsPDF {
  // Safe instantiation supporting ESM named and default export environments
  const DocConstructor: any = typeof jsPDF === 'function' ? jsPDF : (jsPDF as any)?.jsPDF || (jsPDF as any)?.default;
  const doc: jsPDF = new DocConstructor({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  // Header Bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, pageWidth - 2 * margin, 18, 'F');

  doc.setTextColor(248, 250, 252);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('TERRASENTINEL AI — GEOSPATIAL EVIDENCE DOSSIER', margin + 4, y + 8);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `INVESTIGATIVE REPORT | CASE ${c.id} | ISSUED: ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC`,
    margin + 4,
    y + 14
  );

  y += 24;

  // Warning Banner if demo
  if (c.isDemoCase) {
    doc.setFillColor(254, 243, 199); // amber-100
    doc.setDrawColor(245, 158, 11); // amber-500
    doc.rect(margin, y, pageWidth - 2 * margin, 8, 'FD');
    doc.setTextColor(180, 83, 9);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DEMONSTRATION BENCHMARK FIXTURE — NOT A LIVE OPERATIONAL AUDIT', margin + 4, y + 5.5);
    y += 12;
  }

  // Section 1: Executive Summary & Identification
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('1. TARGET JURISDICTION & CASE IDENTIFICATION', margin, y);
  y += 5;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  const idRows = [
    ['Case Identifier:', c.id, 'Candidate Category:', c.category],
    ['Target District:', c.districtName, 'Jurisdiction Source:', c.jurisdiction],
    ['Centroid Coords:', `${formatCoordinates(c.centroid[0], c.centroid[1])}`, 'Footprint Relation:', c.footprintRelation],
    ['Estimated Disturbance Area:', `${c.areaHa} ha (${c.areaSqm.toLocaleString()} m²)`, 'Calculation Method:', c.areaCalculationMethod],
    ['Permit / Lease Status:', c.permitStatus, 'Review Priority Score:', `${c.reviewPriorityScore} / 100`],
  ];

  idRows.forEach(([l1, v1, l2, v2]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(l1, margin + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(v1), margin + 45, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text(l2, margin + 98, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(v2), margin + 140, y);
    y += 4.5;
  });

  y += 4;

  // Section 2: Satellite Observation Pair
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('2. SATELLITE OBSERVATION METADATA (SENTINEL-2 L2A)', margin, y);
  y += 5;

  // Observation comparison table
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - 2 * margin, 24, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);

  doc.text('PARAMETER', margin + 3, y + 4.5);
  doc.text('OBSERVATION T1 (PRE-DISTURBANCE)', margin + 48, y + 4.5);
  doc.text('OBSERVATION T2 (POST-DISTURBANCE)', margin + 118, y + 4.5);

  doc.setFont('helvetica', 'normal');
  const obsRows = [
    ['Acquisition Date (UTC):', c.observationT1.date.replace('T', ' ').slice(0, 19), c.observationT2.date.replace('T', ' ').slice(0, 19)],
    ['Sentinel-2 Scene ID:', c.observationT1.sceneId.slice(0, 32) + '...', c.observationT2.sceneId.slice(0, 32) + '...'],
    ['Platform & Tile:', `${c.observationT1.platform} | Tile ${c.observationT1.gridCode}`, `${c.observationT2.platform} | Tile ${c.observationT2.gridCode}`],
    ['Cloud Cover / Sun Angle:', `${c.observationT1.cloudCover}% | ${c.observationT1.sunElevation}°`, `${c.observationT2.cloudCover}% | ${c.observationT2.sunElevation}°`],
  ];

  let ty = y + 9;
  obsRows.forEach(([param, t1, t2]) => {
    doc.setTextColor(71, 85, 105);
    doc.text(param, margin + 3, ty);
    doc.setTextColor(15, 23, 42);
    doc.text(t1, margin + 48, ty);
    doc.text(t2, margin + 118, ty);
    ty += 4.2;
  });

  y += 30;

  // Section 3: Spectral & Evidence Analysis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('3. SPECTRAL SHIFT & MULTI-CRITERIA EVIDENCE SCORES', margin, y);
  y += 5;

  const spectralMetrics = [
    `Delta NDVI (Vegetation Loss): ${c.spectralShift.dNDVI} (Pre: ${c.spectralShift.preMeanNDVI} -> Post: ${c.spectralShift.postMeanNDVI})`,
    `Delta BSI (Bare Soil / Mineral Rise): ${c.spectralShift.dBSI} (Pre: ${c.spectralShift.preMeanBSI} -> Post: ${c.spectralShift.postMeanBSI})`,
    `Delta NDMI (Moisture Depletion): ${c.spectralShift.dNDMI}`,
    `Spatial Coherence Evidence Score: ${c.evidenceScores.spatialCoherenceScore}/100 (Compact contiguous excavation pit)`,
    `Observation Atmospheric Quality: ${c.evidenceScores.observationQualityScore}/100 (SCL cloudless pass)`,
    `Environmental Buffer Proximity: ${c.environmentalOverlap || 'No declared buffer breach'}`,
  ];

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  spectralMetrics.forEach((m) => {
    doc.text('• ' + m, margin + 3, y);
    y += 4.2;
  });

  y += 4;

  // Section 4: Alternative Explanations & False Positive Review
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('4. FALSE-POSITIVE EVALUATION & ALTERNATIVE HYPOTHESES', margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  c.alternativeExplanations.forEach((alt) => {
    doc.text('• ' + alt, margin + 3, y);
    y += 4;
  });

  y += 4;

  // Section 5: Review Decision & Field Inspector Checklist
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('5. HUMAN REVIEW STATUS & FIELD VERIFICATION AUDIT', margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(`Current Review Status: ${c.reviewStatus}`, margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Reviewed by: ${c.reviewerName || 'Unassigned'} | Date: ${c.reviewedAt ? c.reviewedAt.slice(0, 10) : 'Pending review'}`, margin + 65, y);
  y += 4.5;

  if (c.reviewerNotes) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(71, 85, 105);
    doc.text(`Reviewer Notes: "${c.reviewerNotes}"`, margin + 3, y);
    y += 5;
  }

  // Checklist
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Mandatory Ground Audit Checklist for Mining Inspectorate:', margin + 3, y);
  y += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const checklist = [
    '[ ] 1. Verify existence of demarcated boundary survey boundary pillars (boundary stones/pegs).',
    '[ ] 2. Inspect whether heavy earth-moving machinery (excavators, loaders, crushers) is present inside the detected polygon.',
    '[ ] 3. Check official mineral dispatch registers and electronic transit passes (e-Permits).',
    '[ ] 4. Measure depth of extraction benching and highwall geometry using handheld laser distometer.',
    '[ ] 5. Collect GPS ground truth coordinates at northernmost and southernmost pit perimeters.',
  ];

  checklist.forEach((item) => {
    doc.text(item, margin + 4, y);
    y += 4;
  });

  y += 5;

  // Statutory Disclaimer (Prominent legal boundary)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, pageWidth - 2 * margin, 18, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(6.8);
  doc.setFont('helvetica', 'bold');
  doc.text('STATUTORY GEOSPATIAL INTELLIGENCE NOTICE & LIMITATION OF LIABILITY:', margin + 3, y + 4);
  const disclaimer =
    'This dossier represents candidate land-disturbance signals extracted from Sentinel-2 satellite reflectance data. Remote sensing cannot independently establish title ownership, mineral concessions, statutory permits, or legal guilt. It is generated strictly as an objective technical aid for inspection prioritization under district administrative authority.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 2 * margin - 6);
  doc.text(splitDisclaimer, margin + 3, y + 8);

  // Download trigger
  const filename = `${c.id}_Investigation_Dossier.pdf`;
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    doc.save(filename);
  }
  return doc;
}

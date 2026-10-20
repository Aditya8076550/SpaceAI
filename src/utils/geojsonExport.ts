import { CandidateCase } from '../types/geospatial';

export function buildCaseGeoJSON(c: CandidateCase) {
  return {
    type: 'FeatureCollection',
    name: `TerraSentinel_${c.id}`,
    crs: {
      type: 'name',
      properties: {
        name: 'urn:ogc:def:crs:OGC:1.3:CRS84',
      },
    },
    features: [
      {
        type: 'Feature',
        id: c.id,
        geometry: c.geometry,
        properties: {
          caseId: c.id,
          districtId: c.districtId,
          districtName: c.districtName,
          jurisdiction: c.jurisdiction,
          category: c.category,
          footprintRelation: c.footprintRelation,
          areaHectares: c.areaHa,
          areaSquareMeters: c.areaSqm,
          areaCalculationMethod: c.areaCalculationMethod,
          reviewPriorityScore: c.reviewPriorityScore,
          permitStatus: c.permitStatus,
          reviewStatus: c.reviewStatus,
          reviewerNotes: c.reviewerNotes || null,
          reviewerName: c.reviewerName || null,
          reviewedAt: c.reviewedAt || null,
          isDemoCase: c.isDemoCase,
          spectralShift: {
            deltaNDVI: c.spectralShift.dNDVI,
            deltaBSI: c.spectralShift.dBSI,
            deltaNDMI: c.spectralShift.dNDMI,
          },
          observationT1: {
            date: c.observationT1.date,
            sceneId: c.observationT1.sceneId,
            cloudCover: c.observationT1.cloudCover,
          },
          observationT2: {
            date: c.observationT2.date,
            sceneId: c.observationT2.sceneId,
            cloudCover: c.observationT2.cloudCover,
          },
          detectorVersion: c.detectorVersion,
          disclaimer:
            'Candidate land disturbance for investigation purposes only. Does not constitute proof of legal violation or unauthorized quarrying without ground audit.',
        },
      },
    ],
  };
}

export function exportCaseToGeoJSON(c: CandidateCase): void {
  const geojson = buildCaseGeoJSON(c);
  const jsonString = JSON.stringify(geojson, null, 2);

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([jsonString], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${c.id}_geometry.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

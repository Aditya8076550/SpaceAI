import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { DistrictBoundary, CandidateCase } from '../types/geospatial';
import {
  Satellite,
  Search,
  Calendar,
  Layers,
  MapPin,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Info,
  Compass,
} from 'lucide-react';
import { formatCoordinates } from '../utils/geoCalculations';

interface SatelliteMapSectionProps {
  districts: DistrictBoundary[];
  selectedDistrict: DistrictBoundary;
  onSelectDistrict: (d: DistrictBoundary) => void;
  startDate: string;
  setStartDate: (s: string) => void;
  endDate: string;
  setEndDate: (s: string) => void;
  onSearchScenes: () => Promise<void>;
  isSearchingScenes: boolean;
  stacError: string | null;
  discoveredScenes: any[];
  cases: CandidateCase[];
  selectedCase: CandidateCase | null;
  onSelectCase: (c: CandidateCase) => void;
  onNavigateToDetection: () => void;
  onNavigateToReport: () => void;
}

export const SatelliteMapSection: React.FC<SatelliteMapSectionProps> = ({
  districts,
  selectedDistrict,
  onSelectDistrict,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onSearchScenes,
  isSearchingScenes,
  stacError,
  discoveredScenes,
  cases,
  selectedCase,
  onSelectCase,
  onNavigateToDetection,
  onNavigateToReport,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayersRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayersRef = useRef<L.LayerGroup | null>(null);

  const [activeBaseLayer, setActiveBaseLayer] = useState<'satellite' | 'dark' | 'topo'>('satellite');
  const [showKnownLeases, setShowKnownLeases] = useState<boolean>(true);
  const [showCandidateDisturbances, setShowCandidateDisturbances] = useState<boolean>(true);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: selectedDistrict.center,
      zoom: selectedDistrict.zoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      setCursorCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    const polygonGroup = L.layerGroup().addTo(map);
    const boundaryGroup = L.layerGroup().addTo(map);

    polygonLayersRef.current = polygonGroup;
    boundaryLayersRef.current = boundaryGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [selectedDistrict.id]);

  // Update Base Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = '';
    let attribution = '';

    if (activeBaseLayer === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Maxar, Earthstar Geographics';
    } else if (activeBaseLayer === 'dark') {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
      attribution = '&copy; CARTO';
    } else {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors';
    }

    L.tileLayer(tileUrl, {
      attribution,
      maxZoom: 19,
    }).addTo(map);
  }, [activeBaseLayer]);

  // Render Overlays: District boundary, known leases, and candidate disturbance polygons
  useEffect(() => {
    const map = mapInstanceRef.current;
    const boundaryGroup = boundaryLayersRef.current;
    const polygonGroup = polygonLayersRef.current;
    if (!map || !boundaryGroup || !polygonGroup) return;

    boundaryGroup.clearLayers();
    polygonGroup.clearLayers();

    // 1. District Bounding Box
    const [minLon, minLat, maxLon, maxLat] = selectedDistrict.bbox;
    const bboxBounds: L.LatLngBoundsExpression = [
      [minLat, minLon],
      [maxLat, maxLon],
    ];
    L.rectangle(bboxBounds, {
      color: '#38bdf8',
      weight: 1.5,
      dashArray: '4, 4',
      fill: false,
    }).addTo(boundaryGroup);

    // 2. Known Mining Leases
    if (showKnownLeases && selectedDistrict.knownLeasePolygons) {
      selectedDistrict.knownLeasePolygons.forEach((lease) => {
        const latLngs = lease.coordinates.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]);
        const polygon = L.polygon(latLngs, {
          color: '#f59e0b',
          weight: 1.5,
          dashArray: '3, 3',
          fillColor: '#f59e0b',
          fillOpacity: 0.12,
        });
        polygon.bindTooltip(
          `<div class="font-mono text-xs"><strong>${lease.name}</strong><br/>Permitted Mineral: ${lease.permittedMineral}<br/>Valid until: ${lease.expiryDate}</div>`,
          { sticky: true }
        );
        polygon.addTo(boundaryGroup);
      });
    }

    // 3. Sensitive Wildlife/Forest Buffers
    if (selectedDistrict.sensitiveZones) {
      selectedDistrict.sensitiveZones.forEach((zone) => {
        const latLngs = zone.coordinates.map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]);
        const polygon = L.polygon(latLngs, {
          color: '#10b981',
          weight: 1.5,
          dashArray: '4, 3',
          fillColor: '#10b981',
          fillOpacity: 0.1,
        });
        polygon.bindTooltip(
          `<div class="font-mono text-xs"><strong>Protected Buffer: ${zone.name}</strong><br/>Zone Classification: ${zone.type}</div>`,
          { sticky: true }
        );
        polygon.addTo(boundaryGroup);
      });
    }

    // 4. Candidate Disturbance Polygons
    if (showCandidateDisturbances) {
      cases.forEach((c) => {
        const coords = c.geometry.coordinates[0];
        const latLngs = coords.map(([lon, lat]) => [lat, lon] as [number, number]);
        const isSelected = selectedCase?.id === c.id;

        const polygon = L.polygon(latLngs, {
          color: isSelected ? '#10b981' : '#ef4444',
          weight: isSelected ? 3 : 2,
          fillColor: isSelected ? '#10b981' : '#ef4444',
          fillOpacity: isSelected ? 0.45 : 0.28,
        });

        // Add Marker at Centroid
        const marker = L.circleMarker([c.centroid[0], c.centroid[1]], {
          radius: 6,
          color: '#ffffff',
          weight: 1.5,
          fillColor: '#ef4444',
          fillOpacity: 0.9,
        });

        const tooltipContent = `
          <div class="font-mono text-xs p-1">
            <div class="font-bold text-red-500">${c.id}</div>
            <div class="text-slate-700 font-semibold">${c.category}</div>
            <div class="text-slate-600 mt-0.5">Area: <strong>${c.areaHa} ha</strong> (${c.areaSqm.toLocaleString()} m²)</div>
            <div class="text-slate-500 text-[10px]">ΔNDVI: ${c.spectralShift.dNDVI} | ΔBSI: +${c.spectralShift.dBSI}</div>
            <div class="text-emerald-700 font-bold mt-1">Click to inspect in Case Report &rarr;</div>
          </div>
        `;

        polygon.bindTooltip(tooltipContent, { sticky: true });
        marker.bindTooltip(tooltipContent, { sticky: true });

        const handleClick = () => {
          onSelectCase(c);
        };

        polygon.on('click', handleClick);
        marker.on('click', handleClick);

        polygon.addTo(polygonGroup);
        marker.addTo(polygonGroup);
      });
    }
  }, [selectedDistrict, cases, selectedCase, showKnownLeases, showCandidateDisturbances]);

  return (
    <div className="space-y-6">
      {/* Top Controls: District Selector & Observation Search */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
          {/* District Selection */}
          <div className="lg:col-span-4 space-y-1.5">
            <label className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-400" />
              <span>Target Mining District (AOI):</span>
            </label>
            <select
              value={selectedDistrict.id}
              onChange={(e) => {
                const found = districts.find((d) => d.id === e.target.value);
                if (found) onSelectDistrict(found);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-emerald-500"
            >
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.state}) — {d.miningCategory}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range: Before (T1) and After (T2) */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>Start Date:</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-400 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-500" />
                <span>End Date:</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="lg:col-span-3">
            <button
              type="button"
              onClick={onSearchScenes}
              disabled={isSearchingScenes}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
            >
              <Search className={`h-4 w-4 ${isSearchingScenes ? 'animate-spin' : ''}`} />
              <span>{isSearchingScenes ? 'Searching STAC Catalog...' : 'Search Satellite Observations'}</span>
            </button>
          </div>
        </div>

        {/* Selected District Coordinates and Info */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Bounding Box:</span>
            <span className="text-slate-300">[{selectedDistrict.bbox.join(', ')}]</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Center:</span>
            <span className="text-slate-300">{formatCoordinates(selectedDistrict.center[0], selectedDistrict.center[1])}</span>
          </div>
          <div className="text-emerald-400 text-[11px]">
            {selectedDistrict.knownLeasePolygons?.length || 0} Known Reference Leases Loaded
          </div>
        </div>
      </div>

      {/* Crucial Notice: Distinguishing Basemap Tiles from Satellite Observations */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <div className="font-bold text-amber-300 font-mono">
            IMPORTANT DISTINCTION: MAP BASEMAP TILES VS. TEMPORAL SATELLITE OBSERVATIONS
          </div>
          <p className="text-amber-200/90 leading-relaxed">
            The interactive map below uses standard web basemap imagery (Esri World Imagery) solely for spatial visual orientation.
            It is <strong>not</strong> the time-stamped satellite observation used for mathematical change detection.
            True multi-spectral change analysis uses calibrated <strong>Copernicus Sentinel-2 Level-2A</strong> observations queried from the STAC catalog between your selected dates.
          </p>
        </div>
      </div>

      {/* Map Container & Layer Toggles */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg relative">
        {/* Map Header Toolbar */}
        <div className="bg-slate-950/90 px-4 py-2.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-emerald-400" />
            <span className="font-mono font-semibold text-slate-200">
              Interactive AOI Map: {selectedDistrict.name}
            </span>
            {cursorCoords && (
              <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">
                ({cursorCoords.lat.toFixed(4)}°N, {cursorCoords.lng.toFixed(4)}°E)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Basemap Switcher */}
            <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 font-mono text-[11px]">
              <button
                type="button"
                onClick={() => setActiveBaseLayer('satellite')}
                className={`px-2.5 py-1 rounded ${activeBaseLayer === 'satellite' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Satellite Basemap
              </button>
              <button
                type="button"
                onClick={() => setActiveBaseLayer('dark')}
                className={`px-2.5 py-1 rounded ${activeBaseLayer === 'dark' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Dark Map
              </button>
              <button
                type="button"
                onClick={() => setActiveBaseLayer('topo')}
                className={`px-2.5 py-1 rounded ${activeBaseLayer === 'topo' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Street/Topo
              </button>
            </div>

            {/* Overlay Toggles */}
            <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showKnownLeases}
                onChange={(e) => setShowKnownLeases(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
              />
              <span>Quarry Leases</span>
            </label>

            <label className="flex items-center gap-1.5 text-[11px] font-mono text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showCandidateDisturbances}
                onChange={(e) => setShowCandidateDisturbances(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
              />
              <span className="text-red-400 font-semibold">Disturbances ({cases.length})</span>
            </label>
          </div>
        </div>

        {/* Leaflet Map DOM Element */}
        <div ref={mapContainerRef} className="h-[460px] w-full bg-slate-950" />

        {/* Selected Candidate Quick Float */}
        {selectedCase && (
          <div className="absolute bottom-4 left-4 z-[400] max-w-md bg-slate-950/95 border border-emerald-500/50 rounded-xl p-3.5 shadow-xl backdrop-blur font-sans">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-400">{selectedCase.id}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                    Candidate Disturbance
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-100 mt-1">{selectedCase.category}</div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Affected Area: <strong className="text-emerald-300">{selectedCase.areaHa} ha</strong> ({selectedCase.areaSqm.toLocaleString()} m²)
                </div>
              </div>

              <button
                type="button"
                onClick={onNavigateToReport}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 transition-all"
              >
                <span>Case Report</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Discovered Satellite Observations (Live STAC Results) */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Satellite className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 font-mono">
                Sentinel-2 L2A Satellite Observations in Date Range
              </h3>
              <p className="text-xs text-slate-400">
                Live STAC metadata retrieved from Earth Search AWS (Element 84) open Copernicus repository
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
              {discoveredScenes.length} Observation(s) Available
            </span>
            <button
              type="button"
              onClick={onNavigateToDetection}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>Go to Change Detection</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {stacError && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{stacError}</span>
          </div>
        )}

        {discoveredScenes.length === 0 && !isSearchingScenes && !stacError && (
          <div className="bg-slate-950 rounded-lg p-6 text-center text-xs text-slate-400 border border-slate-800">
            <p>
              Click <strong>&quot;Search Satellite Observations&quot;</strong> above to query live Sentinel-2 satellite passes over {selectedDistrict.name} between {startDate} and {endDate}.
            </p>
          </div>
        )}

        {/* Table of Actual Scenes */}
        {discoveredScenes.length > 0 && (
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold">OBSERVATION DATE (UTC)</th>
                  <th className="px-3.5 py-2.5 font-semibold">SENTINEL-2 SCENE ID</th>
                  <th className="px-3.5 py-2.5 font-semibold">PLATFORM</th>
                  <th className="px-3.5 py-2.5 font-semibold">CLOUD COVER</th>
                  <th className="px-3.5 py-2.5 font-semibold">MGRS TILE</th>
                  <th className="px-3.5 py-2.5 font-semibold">SUN ELEVATION</th>
                  <th className="px-3.5 py-2.5 font-semibold">BAND ASSETS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
                {discoveredScenes.map((scene: any) => (
                  <tr key={scene.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-3.5 py-2.5 text-slate-200 font-semibold whitespace-nowrap">
                      {scene.datetime ? scene.datetime.replace('T', ' ').slice(0, 19) : 'N/A'}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-300 max-w-xs truncate" title={scene.id}>
                      {scene.id}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                        {scene.platform || 'Sentinel-2'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        (scene.cloudCover || 0) < 5
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}>
                        {typeof scene.cloudCover === 'number' ? scene.cloudCover.toFixed(1) : '0'}%
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-400">
                      {scene.gridCode || '43PFS'}
                    </td>
                    <td className="px-3.5 py-2.5 text-slate-400">
                      {typeof scene.sunElevation === 'number' ? `${scene.sunElevation.toFixed(1)}°` : '52°'}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        12 Bands (10m B02, B03, B04, B08, SCL)
                      </span>
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

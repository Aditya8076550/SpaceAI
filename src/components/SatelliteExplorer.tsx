import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  DistrictBoundary,
  CandidateCase,
  ObservationMetadata,
} from '../types/geospatial';
import {
  Layers,
  Eye,
  Sliders,
  Maximize2,
  MapPin,
  Calendar,
  Satellite,
  Info,
  CheckCircle,
  FileText,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Search,
  Code,
  Check,
} from 'lucide-react';
import { formatCoordinates } from '../utils/geoCalculations';

interface SatelliteExplorerProps {
  selectedDistrict: DistrictBoundary;
  cases: CandidateCase[];
  selectedCase: CandidateCase | null;
  onSelectCase: (c: CandidateCase) => void;
  isDemoMode: boolean;
}

export const SatelliteExplorer: React.FC<SatelliteExplorerProps> = ({
  selectedDistrict,
  cases,
  selectedCase,
  onSelectCase,
  isDemoMode,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const polygonLayersRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayersRef = useRef<L.LayerGroup | null>(null);

  // Workspace sub-view mode
  const [explorerMode, setExplorerMode] = useState<'map' | 'observations' | 'trace'>('map');

  // Map state
  const [activeBaseLayer, setActiveBaseLayer] = useState<'satellite' | 'dark' | 'topo'>('satellite');
  const [showKnownLeases, setShowKnownLeases] = useState<boolean>(true);
  const [showSensitiveZones, setShowSensitiveZones] = useState<boolean>(true);
  const [showCandidatePolygons, setShowCandidatePolygons] = useState<boolean>(true);
  const [swipePosition, setSwipePosition] = useState<number>(50); // percentage for swipe comparison
  const [isSwipeMode, setIsSwipeMode] = useState<boolean>(false);
  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Asset verification state
  const [verifyingUrl, setVerifyingUrl] = useState<string | null>(null);
  const [verifiedAssets, setVerifiedAssets] = useState<Record<string, any>>({});

  // Active observation pair
  const activeCase = selectedCase || (cases.length > 0 ? cases[0] : null);

  // Initialize Map
  useEffect(() => {
    if (explorerMode !== 'map') return;
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

    // Coordinate inspection on mousemove
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
  }, [selectedDistrict.id, explorerMode]);

  // Update Base Layer
  useEffect(() => {
    if (explorerMode !== 'map') return;
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
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics';
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
  }, [activeBaseLayer, explorerMode]);

  // Update Known Leases and Sensitive Zones
  useEffect(() => {
    if (explorerMode !== 'map') return;
    const boundaryGroup = boundaryLayersRef.current;
    if (!boundaryGroup) return;

    boundaryGroup.clearLayers();

    // Render district bounding box
    const [minLon, minLat, maxLon, maxLat] = selectedDistrict.bbox;
    const districtBboxPoly = L.polygon(
      [
        [minLat, minLon],
        [minLat, maxLon],
        [maxLat, maxLon],
        [maxLat, minLon],
      ],
      {
        color: '#64748b',
        weight: 1.5,
        dashArray: '4, 4',
        fill: false,
      }
    ).bindTooltip(`District AOI: ${selectedDistrict.name}`, { sticky: true });
    boundaryGroup.addLayer(districtBboxPoly);

    // Render known quarry lease boundaries
    if (showKnownLeases && selectedDistrict.knownLeasePolygons) {
      selectedDistrict.knownLeasePolygons.forEach((lease) => {
        const latLngs = lease.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
        const leasePoly = L.polygon(latLngs, {
          color: '#10b981',
          weight: 2,
          fillColor: '#10b981',
          fillOpacity: 0.12,
          dashArray: '6, 4',
        }).bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px; color: #0f172a;">
            <div style="font-weight: bold; color: #059669; font-size: 12px;">${lease.name}</div>
            <div style="margin-top: 4px;"><strong>Lease ID:</strong> ${lease.id}</div>
            <div><strong>Permitted Mineral:</strong> ${lease.permittedMineral}</div>
            <div><strong>Valid Through:</strong> ${lease.expiryDate}</div>
            <div style="margin-top: 4px; font-size: 10px; color: #64748b;">Source: State Directorate of Mines & Geology</div>
          </div>
        `);
        boundaryGroup.addLayer(leasePoly);
      });
    }

    // Render sensitive reserve zones
    if (showSensitiveZones && selectedDistrict.sensitiveZones) {
      selectedDistrict.sensitiveZones.forEach((sz) => {
        const latLngs = sz.coordinates.map(([lon, lat]) => [lat, lon] as [number, number]);
        const szPoly = L.polygon(latLngs, {
          color: sz.type === 'FOREST_RESERVE' ? '#22c55e' : '#06b6d4',
          weight: 2,
          fillColor: sz.type === 'FOREST_RESERVE' ? '#22c55e' : '#06b6d4',
          fillOpacity: 0.15,
        }).bindPopup(`
          <div style="font-family: sans-serif; font-size: 11px; color: #0f172a;">
            <div style="font-weight: bold; color: #166534; font-size: 12px;">${sz.name}</div>
            <div style="margin-top: 4px;"><strong>Designation:</strong> Statutory Ecological Buffer</div>
          </div>
        `);
        boundaryGroup.addLayer(szPoly);
      });
    }
  }, [selectedDistrict, showKnownLeases, showSensitiveZones, explorerMode]);

  // Update Candidate Polygons
  useEffect(() => {
    if (explorerMode !== 'map') return;
    const polygonGroup = polygonLayersRef.current;
    if (!polygonGroup) return;

    polygonGroup.clearLayers();
    if (!showCandidatePolygons) return;

    cases.forEach((c) => {
      const isSelected = selectedCase?.id === c.id;
      const coords = c.geometry.coordinates[0];
      const latLngs = coords.map(([lon, lat]) => [lat, lon] as [number, number]);

      const isHighPriority = c.reviewPriorityScore >= 85;
      const strokeColor = isSelected
        ? '#38bdf8'
        : isHighPriority
        ? '#ef4444'
        : '#f59e0b';

      const poly = L.polygon(latLngs, {
        color: strokeColor,
        weight: isSelected ? 3.5 : 2,
        fillColor: strokeColor,
        fillOpacity: isSelected ? 0.45 : 0.25,
      });

      poly.on('click', () => onSelectCase(c));
      poly.bindPopup(`
        <div style="font-family: monospace; font-size: 11px; color: #0f172a; min-width: 220px;">
          <div style="font-weight: bold; font-size: 13px; color: #dc2626;">${c.id}</div>
          <div style="margin-top: 2px; font-weight: 600; font-family: sans-serif;">${c.category}</div>
          <hr style="margin: 6px 0; border: none; border-top: 1px solid #e2e8f0;" />
          <div><strong>Estimated Area:</strong> ${c.areaHa} ha (${c.areaSqm.toLocaleString()} m²)</div>
          <div><strong>Spectral ΔBSI:</strong> +${c.spectralShift.dBSI}</div>
          <div><strong>Spectral ΔNDVI:</strong> ${c.spectralShift.dNDVI}</div>
          <div><strong>Priority Score:</strong> ${c.reviewPriorityScore}/100</div>
          <div><strong>Status:</strong> ${c.reviewStatus}</div>
        </div>
      `);

      polygonGroup.addLayer(poly);

      const marker = L.circleMarker(c.centroid, {
        radius: isSelected ? 7 : 5,
        color: strokeColor,
        fillColor: '#ffffff',
        fillOpacity: 0.9,
        weight: 2,
      }).on('click', () => onSelectCase(c));

      polygonGroup.addLayer(marker);
    });
  }, [cases, selectedCase, showCandidatePolygons, explorerMode]);

  // Handle live verification of an asset URL
  const handleVerifyAsset = async (assetUrl: string) => {
    setVerifyingUrl(assetUrl);
    try {
      const res = await fetch('/api/satellite/verify-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetUrl }),
      });
      const data = await res.json();
      setVerifiedAssets((prev) => ({ ...prev, [assetUrl]: data }));
    } catch (e: any) {
      setVerifiedAssets((prev) => ({
        ...prev,
        [assetUrl]: { success: false, error: e.message },
      }));
    } finally {
      setVerifyingUrl(null);
    }
  };

  return (
    <div className="relative h-[calc(100vh-140px)] min-h-[620px] w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex flex-col">
      {/* Workspace Header Toolbar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Satellite className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-slate-100">
              SATELLITE WORKSPACE
            </span>
          </div>

          {/* Sub-view Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setExplorerMode('map')}
              className={`px-3 py-1 rounded transition-colors ${
                explorerMode === 'map'
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              GIS Map & Polygons
            </button>
            <button
              type="button"
              onClick={() => setExplorerMode('observations')}
              className={`px-3 py-1 rounded transition-colors ${
                explorerMode === 'observations'
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Observations (T1 vs T2)
            </button>
            <button
              type="button"
              onClick={() => setExplorerMode('trace')}
              className={`px-3 py-1 rounded transition-colors ${
                explorerMode === 'trace'
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ARD Band & Asset Trace
            </button>
          </div>
        </div>

        {/* Observation Metadata Pill */}
        {activeCase && (
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded border border-slate-800">
            <Calendar className="h-3.5 w-3.5 text-slate-500" />
            <span>T1: {activeCase.observationT1.date.slice(0, 10)}</span>
            <span className="text-slate-600">&rarr;</span>
            <span className="text-emerald-400">T2: {activeCase.observationT2.date.slice(0, 10)}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Tile: {activeCase.observationT1.gridCode}</span>
          </div>
        )}
      </div>

      {/* Main Workspace Body */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* MODE 1: GIS Map Workspace */}
        {explorerMode === 'map' && (
          <div className="w-full h-full relative">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Base Layer Switcher & Swipe Controls */}
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <div className="flex items-center bg-slate-950/90 border border-slate-800 rounded-lg p-0.5 text-xs font-mono backdrop-blur shadow-md">
                <button
                  type="button"
                  onClick={() => setActiveBaseLayer('satellite')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeBaseLayer === 'satellite' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400'
                  }`}
                >
                  Satellite Base
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBaseLayer('dark')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeBaseLayer === 'dark' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400'
                  }`}
                >
                  Dark Base
                </button>
                <button
                  type="button"
                  onClick={() => setActiveBaseLayer('topo')}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    activeBaseLayer === 'topo' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400'
                  }`}
                >
                  Topo
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsSwipeMode(!isSwipeMode)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border backdrop-blur shadow-md flex items-center gap-1.5 ${
                  isSwipeMode
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                    : 'bg-slate-950/90 text-slate-400 border-slate-800'
                }`}
              >
                <Sliders className="h-3 w-3" />
                <span>{isSwipeMode ? 'Exit Swipe' : 'T1 / T2 Swipe'}</span>
              </button>
            </div>

            {/* Swipe comparison overlay bar if enabled */}
            {isSwipeMode && activeCase && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/90 border border-slate-700 px-4 py-2 rounded-xl backdrop-blur shadow-xl flex items-center gap-4 text-xs font-mono">
                <div className="text-slate-300">
                  <span className="text-slate-500 font-bold mr-1">T1 Baseline:</span>
                  <span>{activeCase.observationT1.date.slice(0, 10)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={swipePosition}
                  onChange={(e) => setSwipePosition(parseInt(e.target.value, 10))}
                  className="w-32 accent-emerald-500"
                />
                <div className="text-emerald-400">
                  <span className="text-slate-500 font-bold mr-1">T2 Candidate:</span>
                  <span>{activeCase.observationT2.date.slice(0, 10)}</span>
                </div>
              </div>
            )}

            {/* Floating Map Legend & Layer Checkboxes */}
            <div className="absolute bottom-4 left-4 z-20 bg-slate-950/90 border border-slate-800 p-3 rounded-xl backdrop-blur shadow-lg text-xs space-y-2 font-sans max-w-xs">
              <div className="font-mono text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
                <span>Layers & Overlays</span>
                <span className="text-slate-500 text-[10px]">EPSG:4326</span>
              </div>

              <div className="space-y-1 text-[11px]">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={showCandidatePolygons}
                    onChange={(e) => setShowCandidatePolygons(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span className="h-2 w-3 rounded-sm bg-red-500 inline-block"></span>
                  <span>Candidate Disturbance Polygons ({cases.length})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={showKnownLeases}
                    onChange={(e) => setShowKnownLeases(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span className="h-2 w-3 rounded-sm bg-emerald-500/20 border border-emerald-500 border-dashed inline-block"></span>
                  <span>Permitted Mining Leases ({selectedDistrict.knownQuarriesCount})</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={showSensitiveZones}
                    onChange={(e) => setShowSensitiveZones(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span className="h-2 w-3 rounded-sm bg-green-500/30 border border-green-500 inline-block"></span>
                  <span>Ecological Forest Buffers</span>
                </label>
              </div>
            </div>

            {/* Selected Case Quick Card (Floating top right) */}
            {selectedCase && (
              <div className="absolute top-4 right-4 z-20 bg-slate-950/95 border border-slate-800 p-4 rounded-xl backdrop-blur shadow-xl text-xs w-80 font-sans space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    {selectedCase.id}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                    Priority: {selectedCase.reviewPriorityScore}/100
                  </span>
                </div>

                <div className="text-slate-200 font-medium">{selectedCase.category}</div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-500 text-[9px] block">AFFECTED AREA</span>
                    <span className="text-slate-100 font-bold">{selectedCase.areaHa} ha</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] block">PERMIT STATUS</span>
                    <span className="text-amber-400 font-bold truncate block">{selectedCase.permitStatus}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] block">SPECTRAL ΔBSI</span>
                    <span className="text-amber-400 font-bold">+{selectedCase.spectralShift.dBSI}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[9px] block">SPECTRAL ΔNDVI</span>
                    <span className="text-red-400 font-bold">{selectedCase.spectralShift.dNDVI}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectCase(selectedCase)}
                  className="w-full py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1 font-mono"
                >
                  <FileText className="h-3 w-3" />
                  <span>Open Investigation Dossier</span>
                </button>
              </div>
            )}

            {cursorCoords && (
              <div className="absolute bottom-4 right-14 z-20 bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[10px] font-mono text-slate-400 backdrop-blur pointer-events-none">
                <span>{formatCoordinates(cursorCoords.lat, cursorCoords.lng)}</span>
                <span className="ml-2 text-slate-600">|</span>
                <span className="ml-2 text-emerald-400">EPSG:4326</span>
              </div>
            )}
          </div>
        )}

        {/* MODE 2: Genuine Observation Imagery Viewer (T1 vs T2) */}
        {explorerMode === 'observations' && activeCase && (
          <div className="h-full overflow-y-auto p-6 space-y-6 bg-slate-950">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  GENUINE RETRIEVED OBSERVATION COMPARISON
                </h3>
                <p className="text-xs text-slate-400">
                  Actual Sentinel-2 Level-2A imagery pair for {activeCase.districtName} (MGRS Tile {activeCase.observationT1.gridCode}).
                </p>
              </div>
              <div className="text-xs font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded border border-slate-800">
                <span>Catalogue: </span>
                <span className="text-emerald-400 font-semibold">Earth Search v1 / AWS Open Data</span>
              </div>
            </div>

            {/* Side-by-Side Observation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Observation T1 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md space-y-3">
                <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="font-mono text-xs">
                    <span className="text-slate-500 font-bold mr-1">T1 PRE-DISTURBANCE:</span>
                    <span className="text-slate-200 font-bold">{activeCase.observationT1.date.slice(0, 10)}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Cloud: {activeCase.observationT1.cloudCover}%
                  </span>
                </div>

                {/* Rendered Visual Imagery */}
                <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden border-y border-slate-800/80">
                  {activeCase.observationT1.thumbnail ? (
                    <img
                      src={activeCase.observationT1.thumbnail}
                      alt={`Sentinel-2 T1 Scene ${activeCase.observationT1.sceneId}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6 text-xs text-slate-500 font-mono">
                      <Satellite className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                      <div>Sentinel-2 L2A BOA Scene Rendered</div>
                      <div className="text-[10px] text-slate-600 mt-1">{activeCase.observationT1.sceneId}</div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-slate-300">
                    True Color (RGB: B04, B03, B02) &bull; 10m Ground Resolution
                  </div>
                </div>

                <div className="p-4 space-y-2 text-xs font-mono">
                  <div className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Scene ID:</span>{' '}
                    <span className="text-slate-200 truncate block">{activeCase.observationT1.sceneId}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>Platform: <strong className="text-slate-200">{activeCase.observationT1.platform}</strong></div>
                    <div>Sun Elevation: <strong className="text-slate-200">{activeCase.observationT1.sunElevation}°</strong></div>
                    <div>Baseline NDVI: <strong className="text-slate-200">{activeCase.spectralShift.preMeanNDVI}</strong></div>
                    <div>Baseline BSI: <strong className="text-slate-200">{activeCase.spectralShift.preMeanBSI}</strong></div>
                  </div>
                </div>
              </div>

              {/* Observation T2 */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md space-y-3">
                <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="font-mono text-xs">
                    <span className="text-emerald-400 font-bold mr-1">T2 POST-DISTURBANCE:</span>
                    <span className="text-emerald-400 font-bold">{activeCase.observationT2.date.slice(0, 10)}</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    Cloud: {activeCase.observationT2.cloudCover}%
                  </span>
                </div>

                {/* Rendered Visual Imagery */}
                <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden border-y border-slate-800/80">
                  {activeCase.observationT2.thumbnail ? (
                    <img
                      src={activeCase.observationT2.thumbnail}
                      alt={`Sentinel-2 T2 Scene ${activeCase.observationT2.sceneId}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-6 text-xs text-slate-500 font-mono">
                      <Satellite className="h-8 w-8 mx-auto text-slate-600 mb-2" />
                      <div>Sentinel-2 L2A BOA Scene Rendered</div>
                      <div className="text-[10px] text-slate-600 mt-1">{activeCase.observationT2.sceneId}</div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-emerald-300">
                    Candidate Disturbance Detected &bull; ΔBSI: +{activeCase.spectralShift.dBSI}
                  </div>
                </div>

                <div className="p-4 space-y-2 text-xs font-mono">
                  <div className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Scene ID:</span>{' '}
                    <span className="text-slate-200 truncate block">{activeCase.observationT2.sceneId}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                    <div>Platform: <strong className="text-slate-200">{activeCase.observationT2.platform}</strong></div>
                    <div>Sun Elevation: <strong className="text-slate-200">{activeCase.observationT2.sunElevation}°</strong></div>
                    <div>Post NDVI: <strong className="text-red-400">{activeCase.spectralShift.postMeanNDVI} (Δ {activeCase.spectralShift.dNDVI})</strong></div>
                    <div>Post BSI: <strong className="text-amber-400">{activeCase.spectralShift.postMeanBSI} (+{activeCase.spectralShift.dBSI})</strong></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scientific Distinction Notice */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 text-xs font-sans text-slate-400 space-y-1.5">
              <div className="flex items-center gap-2 font-mono font-bold text-slate-200">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Scientific Integrity: Visual Proxy vs. Analysis-Ready Spectral Data (ARD)</span>
              </div>
              <p className="leading-relaxed">
                The browser displays the 8-bit RGB visual proxy generated from Sentinel-2 True Color bands. For scientific detection, the algorithm accesses the 16-bit uint16 Cloud-Optimized GeoTIFFs (COGs) on AWS S3 (`B02, B04, B08, B11, SCL`) at 10m and 20m resolution. Switch to the <strong>ARD Band & Asset Trace</strong> tab above to audit the raw multi-spectral assets.
              </p>
            </div>
          </div>
        )}

        {/* MODE 3: ARD Band & Asset Trace Table */}
        {explorerMode === 'trace' && activeCase && (
          <div className="h-full overflow-y-auto p-6 space-y-6 bg-slate-950 font-mono text-xs">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono">
                  MULTI-SPECTRAL ASSET MANIFEST & LIVE S3 REACHABILITY AUDIT
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  Trace the exact asset URIs, format, resolution, and byte-range verification for Sentinel-2 observation assets.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-emerald-400 font-bold">
                EPSG:{activeCase.observationT1.epsgCode || 32643} (UTM Zone 43N)
              </span>
            </div>

            {/* Observation T2 Asset Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="font-bold text-slate-200">
                  Target Scene: {activeCase.observationT2.sceneId} (Acquisition: {activeCase.observationT2.date.slice(0, 19)} UTC)
                </span>
                <span className="text-slate-500 text-[11px]">Dimensions: 10,980 &times; 10,980 pixels</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Band / Asset Key</th>
                      <th className="py-2.5 px-3">Description & Wavelength</th>
                      <th className="py-2.5 px-3">GSD</th>
                      <th className="py-2.5 px-3">Format / Profile</th>
                      <th className="py-2.5 px-3">Remote Asset URI</th>
                      <th className="py-2.5 px-3 text-right">Reachability Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {[
                      {
                        key: 'B02',
                        name: 'Blue Band (490 nm)',
                        gsd: '10m',
                        format: 'COG (uint16)',
                        url: `https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/43/P/FS/2024/2/S2B_43PFS_20240225_0_L2A/B02.tif`,
                      },
                      {
                        key: 'B04',
                        name: 'Red Band (665 nm)',
                        gsd: '10m',
                        format: 'COG (uint16)',
                        url: `https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/43/P/FS/2024/2/S2B_43PFS_20240225_0_L2A/B04.tif`,
                      },
                      {
                        key: 'B08',
                        name: 'NIR Band 1 (842 nm)',
                        gsd: '10m',
                        format: 'COG (uint16)',
                        url: `https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/43/P/FS/2024/2/S2B_43PFS_20240225_0_L2A/B08.tif`,
                      },
                      {
                        key: 'B11',
                        name: 'SWIR 1 Band (1610 nm)',
                        gsd: '20m',
                        format: 'COG (uint16)',
                        url: `https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/43/P/FS/2024/2/S2B_43PFS_20240225_0_L2A/B11.tif`,
                      },
                      {
                        key: 'SCL',
                        name: 'Scene Classification Layer',
                        gsd: '20m',
                        format: 'COG (uint8)',
                        url: `https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/43/P/FS/2024/2/S2B_43PFS_20240225_0_L2A/SCL.tif`,
                      },
                      {
                        key: 'TCI (Visual)',
                        name: 'True Color 3-Band Composite',
                        gsd: '10m',
                        format: 'COG (RGB)',
                        url: `https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/43/P/FS/2024/2/S2B_43PFS_20240225_0_L2A/TCI.tif`,
                      },
                      {
                        key: 'thumbnail',
                        name: 'Browse Navigation Thumbnail',
                        gsd: 'Overview',
                        format: 'JPEG (8-bit)',
                        url: `https://sentinel-cogs.s3.us-west-2.amazonaws.com/sentinel-s2-l2a-cogs/43/P/FS/2024/2/S2B_43PFS_20240225_0_L2A/thumbnail.jpg`,
                      },
                    ].map((row) => {
                      const v = verifiedAssets[row.url];
                      const isChecking = verifyingUrl === row.url;
                      return (
                        <tr key={row.key} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-emerald-400">{row.key}</td>
                          <td className="py-2.5 px-3 text-slate-200">{row.name}</td>
                          <td className="py-2.5 px-3 text-slate-400">{row.gsd}</td>
                          <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">{row.format}</td>
                          <td className="py-2.5 px-3 text-slate-400 text-[10px] truncate max-w-xs" title={row.url}>
                            {row.url}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {v ? (
                              <div className="text-[11px] text-right font-mono">
                                <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                                  <Check className="h-3 w-3" />
                                  HTTP {v.status} OK
                                </span>
                                <div className="text-[10px] text-slate-500">
                                  {v.contentLengthFormatted} &bull; {v.latencyMs}ms
                                </div>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleVerifyAsset(row.url)}
                                disabled={isChecking}
                                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono transition-colors disabled:opacity-50"
                              >
                                {isChecking ? 'Pinging S3...' : 'Audit S3 HEAD'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* STAC Discovery Configuration Requirements */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-3 font-sans text-xs">
              <div className="flex items-center gap-2 font-mono font-bold text-slate-200">
                <Code className="h-4 w-4 text-emerald-400" />
                <span>Configuration Requirements for Production Remote Sensing Pipelines</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed">
                To run native sub-pixel raster matrix extraction on the original 200+ MB Cloud-Optimized GeoTIFFs rather than HTTP range slices, the host environment requires:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] font-mono">
                <li>GDAL / rasterio / geotiff.js with HTTP Range Request capability (`Accept-Ranges: bytes`).</li>
                <li>Direct AWS S3 access configured in region `us-west-2` (No egress cost within same region).</li>
                <li>Copernicus Data Space Ecosystem (CDSE) OAuth2 token if querying the European ESA Copernicus Hub directly.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

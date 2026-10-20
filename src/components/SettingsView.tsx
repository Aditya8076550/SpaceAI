import React, { useState } from 'react';
import {
  Sliders,
  Satellite,
  Layers,
  ShieldCheck,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  Info,
  Code,
} from 'lucide-react';
import { DEFAULT_DETECTOR_CONFIG, DetectorConfig } from '../utils/remoteSensing';

interface SettingsViewProps {
  config: DetectorConfig;
  onUpdateConfig: (newConfig: DetectorConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onUpdateConfig,
}) => {
  const [dNdvi, setDNdvi] = useState(config.dNdviThreshold);
  const [dBsi, setDBsi] = useState(config.dBsiThreshold);
  const [minArea, setMinArea] = useState(config.minDisturbanceAreaHa);
  const [sclMasking, setSclMasking] = useState(config.sclCloudMaskingEnabled);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig({
      ...config,
      dNdviThreshold: dNdvi,
      dBsiThreshold: dBsi,
      minDisturbanceAreaHa: minArea,
      sclCloudMaskingEnabled: sclMasking,
    });
    setSaveMessage('Detector parameters updated successfully');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleReset = () => {
    setDNdvi(DEFAULT_DETECTOR_CONFIG.dNdviThreshold);
    setDBsi(DEFAULT_DETECTOR_CONFIG.dBsiThreshold);
    setMinArea(DEFAULT_DETECTOR_CONFIG.minDisturbanceAreaHa);
    setSclMasking(DEFAULT_DETECTOR_CONFIG.sclCloudMaskingEnabled);
    onUpdateConfig(DEFAULT_DETECTOR_CONFIG);
    setSaveMessage('Reset to scientific baseline parameters');
    setTimeout(() => setSaveMessage(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5">
          <Sliders className="h-5 w-5 text-emerald-400" />
          <div>
            <h2 className="text-sm font-bold text-slate-100 font-mono tracking-wide">
              DATA SOURCES, SPECTRAL INDICES & DETECTOR CONFIGURATION
            </h2>
            <p className="text-xs text-slate-400">
              Audit and calibrate the baseline optical change detection pipeline parameters.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Config Form */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-6">
          <form onSubmit={handleSave} className="space-y-5">
            <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
              Configurable Detection Thresholds
            </h3>

            {/* Delta NDVI Threshold */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300">
                  Vegetation Drop Threshold (ΔNDVI Cutoff):
                </label>
                <span className="font-mono text-red-400 font-bold">{dNdvi}</span>
              </div>
              <input
                type="range"
                min="-0.50"
                max="-0.10"
                step="0.02"
                value={dNdvi}
                onChange={(e) => setDNdvi(parseFloat(e.target.value))}
                className="w-full accent-red-500"
              />
              <p className="text-[11px] text-slate-500 font-sans">
                Pixels with (NDVI_T2 - NDVI_T1) &le; cutoff are flagged for photosynthetic canopy loss.
              </p>
            </div>

            {/* Delta BSI Threshold */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300">
                  Bare Soil / Mineral Exposure Threshold (ΔBSI Cutoff):
                </label>
                <span className="font-mono text-amber-400 font-bold">+{dBsi}</span>
              </div>
              <input
                type="range"
                min="0.10"
                max="0.50"
                step="0.02"
                value={dBsi}
                onChange={(e) => setDBsi(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
              <p className="text-[11px] text-slate-500 font-sans">
                Bare Soil Index rise indicates newly exposed mineral bedrock, pit highwalls, and overburden piles.
              </p>
            </div>

            {/* Minimum Contiguous Disturbance Area */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label className="font-medium text-slate-300">
                  Minimum Disturbance Cluster Area:
                </label>
                <span className="font-mono text-emerald-400 font-bold">{minArea} ha</span>
              </div>
              <input
                type="range"
                min="0.20"
                max="2.00"
                step="0.10"
                value={minArea}
                onChange={(e) => setMinArea(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <p className="text-[11px] text-slate-500 font-sans">
                Connected-component spatial filter excludes single-pixel noise and localized agricultural tractor passes.
              </p>
            </div>

            {/* SCL Cloud Masking Toggle */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={sclMasking}
                  onChange={(e) => setSclMasking(e.target.checked)}
                  className="rounded accent-emerald-500 h-4 w-4"
                />
                <div>
                  <span className="font-semibold text-slate-100 block">
                    Enable Scene Classification Layer (SCL) Cloud Masking
                  </span>
                  <span className="text-[11px] text-slate-400 block font-sans">
                    Automatically masks SCL classes 3 (Cloud Shadows), 8-9 (Clouds), and 10 (Thin Cirrus).
                  </span>
                </div>
              </label>
            </div>

            {saveMessage && (
              <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>{saveMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono flex items-center gap-1.5"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset to Scientific Defaults</span>
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-xs transition-all"
              >
                Apply Parameters
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Source Transparency & Sensor Specs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
            <Satellite className="h-4 w-4 text-emerald-400" />
            Sensor & STAC Specifications
          </h3>

          <div className="space-y-2.5 text-xs font-mono">
            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">PRIMARY SENSOR</span>
              <span className="text-slate-200 font-bold">Sentinel-2 MultiSpectral Instrument (MSI)</span>
              <span className="text-slate-500 text-[10px] block mt-0.5">Level-2A Bottom-Of-Atmosphere</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">STAC PROVIDER</span>
              <span className="text-slate-200 font-bold">Earth Search v1 (AWS Element 84)</span>
              <span className="text-slate-500 text-[10px] block mt-0.5">Collection: sentinel-2-l2a</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">SPECTRAL BANDS USED</span>
              <div className="text-[11px] text-slate-300 space-y-0.5 mt-1">
                <div>&bull; B02 (Blue, 490nm, 10m)</div>
                <div>&bull; B04 (Red, 665nm, 10m)</div>
                <div>&bull; B08 (NIR, 842nm, 10m)</div>
                <div>&bull; B11 (SWIR-1, 1610nm, 20m)</div>
                <div>&bull; B12 (SWIR-2, 2190nm, 20m)</div>
                <div>&bull; SCL (Scene Classification, 20m)</div>
              </div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">COORDINATE REFERENCE SYSTEM</span>
              <span className="text-emerald-400 font-bold">EPSG:4326 (WGS 84 Ellipsoid)</span>
              <span className="text-slate-500 text-[10px] block mt-0.5">Area: Geodesic Spheroidal Excess</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

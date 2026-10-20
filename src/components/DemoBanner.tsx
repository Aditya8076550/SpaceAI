import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';

export const DemoBanner: React.FC<{ isDemoMode: boolean }> = ({ isDemoMode }) => {
  if (!isDemoMode) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 font-mono">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 animate-bounce" />
          <span className="font-bold tracking-wide">
            DEMO DATA — NOT A REAL SATELLITE DETECTION
          </span>
          <span className="hidden sm:inline text-amber-400/80">
            • Displaying benchmark validation fixtures for system capability demonstration.
          </span>
        </div>
        <div className="text-[11px] text-amber-400/80 font-sans flex items-center gap-1.5">
          <Info className="h-3.5 w-3.5" />
          <span>Demo detections are excluded from real statistical audits.</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { CandidateCase, FootprintRelation, ReviewStatus } from '../types/geospatial';
import {
  ListFilter,
  ArrowUpDown,
  Search,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { formatCoordinates } from '../utils/geoCalculations';

interface DetectionResultsProps {
  cases: CandidateCase[];
  onSelectCase: (c: CandidateCase) => void;
  isDemoMode: boolean;
}

export const DetectionResults: React.FC<DetectionResultsProps> = ({
  cases,
  onSelectCase,
  isDemoMode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [relationFilter, setRelationFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'priority' | 'area' | 'date' | 'bsi'>('priority');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Filtered and sorted cases
  const filteredCases = useMemo(() => {
    return cases
      .filter((c) => {
        if (statusFilter !== 'ALL' && c.reviewStatus !== statusFilter) return false;
        if (relationFilter !== 'ALL' && c.footprintRelation !== relationFilter) return false;
        if (searchTerm.trim() !== '') {
          const term = searchTerm.toLowerCase();
          const matchId = c.id.toLowerCase().includes(term);
          const matchCat = c.category.toLowerCase().includes(term);
          const matchDist = c.districtName.toLowerCase().includes(term);
          if (!matchId && !matchCat && !matchDist) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'priority') {
          diff = a.reviewPriorityScore - b.reviewPriorityScore;
        } else if (sortBy === 'area') {
          diff = a.areaHa - b.areaHa;
        } else if (sortBy === 'date') {
          diff = new Date(a.observationT2.date).getTime() - new Date(b.observationT2.date).getTime();
        } else if (sortBy === 'bsi') {
          diff = a.spectralShift.dBSI - b.spectralShift.dBSI;
        }
        return sortOrder === 'desc' ? -diff : diff;
      });
  }, [cases, statusFilter, relationFilter, searchTerm, sortBy, sortOrder]);

  const totalAreaHa = filteredCases.reduce((acc, c) => acc + c.areaHa, 0);

  return (
    <div className="space-y-5">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-mono">TOTAL CANDIDATES</div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">
            {cases.length}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            {cases.filter((c) => c.isDemoCase).length > 0 ? 'Benchmark fixtures' : 'Active observations'}
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-mono">AGGREGATE DISTURBANCE</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
            {totalAreaHa.toFixed(2)} ha
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
            Geodesic WGS84 area
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-mono">HIGH PRIORITY (SCORE &ge; 85)</div>
          <div className="text-2xl font-bold font-mono text-red-400 mt-1">
            {cases.filter((c) => c.reviewPriorityScore >= 85).length}
          </div>
          <div className="text-[11px] text-red-400/70 font-mono mt-0.5">
            Urgent field review recommended
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-mono">PENDING HUMAN REVIEW</div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {cases.filter((c) => c.reviewStatus === 'UNREVIEWED' || c.reviewStatus === 'MARKED_FOR_INSPECTION').length}
          </div>
          <div className="text-[11px] text-amber-400/70 font-mono mt-0.5">
            Awaiting officer sign-off
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search case ID, category, or district..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-sans"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Review Statuses</option>
            <option value="UNREVIEWED">Unreviewed</option>
            <option value="MARKED_FOR_INSPECTION">Marked for Inspection</option>
            <option value="VERIFIED_PHYSICAL_CHANGE">Verified Physical Change</option>
            <option value="FALSE_POSITIVE">False Positive</option>
          </select>

          <select
            value={relationFilter}
            onChange={(e) => setRelationFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Footprint Types</option>
            <option value="EXPANSION_OUTSIDE_KNOWN_BOUNDARY">Encroachment Outside Lease</option>
            <option value="UNINVENTORIED_CANDIDATE">Uninventoried Disturbance</option>
            <option value="INTERNAL_DISTURBANCE">Internal Lease Disturbance</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="priority">Review Priority Score</option>
            <option value="area">Affected Area (ha)</option>
            <option value="bsi">Delta BSI Magnitude</option>
            <option value="date">Observation Date</option>
          </select>

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-slate-100"
            title="Toggle sort direction"
          >
            <ArrowUpDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {filteredCases.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 font-sans">
            <ListFilter className="h-8 w-8 mx-auto text-slate-600 mb-2" />
            <div>No candidate cases match your search or filter criteria.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 font-mono uppercase tracking-wider">
                  <th className="py-3 px-4">Case ID</th>
                  <th className="py-3 px-4">District & Jurisdiction</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Geodesic Area</th>
                  <th className="py-3 px-4">Spectral Shift (ΔBSI / ΔNDVI)</th>
                  <th className="py-3 px-4">Observation Window</th>
                  <th className="py-3 px-4">Priority Score</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredCases.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => onSelectCase(c)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-bold text-emerald-400">
                      <div className="flex items-center gap-1.5">
                        <span>{c.id}</span>
                        {c.isDemoCase && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 font-mono">
                            DEMO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-sans text-slate-200">
                      <div className="font-semibold text-xs">{c.districtName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
                        {c.jurisdiction}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <div className="font-medium text-slate-200 text-xs">{c.category}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {c.footprintRelation === 'EXPANSION_OUTSIDE_KNOWN_BOUNDARY'
                          ? 'Encroachment beyond lease'
                          : 'Uninventoried candidate'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-100 font-bold">{c.areaHa} ha</div>
                      <div className="text-[10px] text-slate-500 font-normal">
                        {c.areaSqm.toLocaleString()} m²
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-amber-400 font-bold">ΔBSI: +{c.spectralShift.dBSI}</div>
                      <div className="text-red-400 text-[11px]">ΔNDVI: {c.spectralShift.dNDVI}</div>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-300">
                      <div>T1: {c.observationT1.date.slice(0, 10)}</div>
                      <div className="text-emerald-400">T2: {c.observationT2.date.slice(0, 10)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              c.reviewPriorityScore >= 85
                                ? 'bg-red-500'
                                : c.reviewPriorityScore >= 70
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${c.reviewPriorityScore}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-100">{c.reviewPriorityScore}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-sans">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-mono border ${
                          c.reviewStatus === 'MARKED_FOR_INSPECTION'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 font-bold'
                            : c.reviewStatus === 'VERIFIED_PHYSICAL_CHANGE'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30 font-bold'
                            : c.reviewStatus === 'FALSE_POSITIVE'
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-slate-900 text-slate-300 border-slate-800'
                        }`}
                      >
                        {c.reviewStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(c);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 group-hover:bg-emerald-500 group-hover:text-slate-950 text-xs font-sans transition-all flex items-center gap-1 ml-auto font-medium"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Dossier</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
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


import React, { useState, useMemo } from 'react';
import { Truck, Users, MapPin, Clock, BarChart3, Upload, Loader2, AlertCircle, Info, TrendingUp, Download, ChevronDown, Timer, Warehouse, ChevronUp, Hourglass, LineChart as LineChartIcon } from 'lucide-react';
import { parseTransportCsv, calculateMinutesBetween } from './utils/csvParser';
import { Load, DriverStats, AnalysisResult } from './types';
import DashboardCard from './components/DashboardCard';
import { analyzeFleetPerformance } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';

const formatMinutesToHours = (mins: number): string => {
  if (mins === 0) return '0 hrs';
  const hours = (mins / 60).toFixed(1);
  return `${hours} hrs`;
};

const formatMinutesToText = (mins: number): string => {
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

interface DriverChartData extends DriverStats {
  avgExpectedTime: number;
}

const App: React.FC = () => {
  const [csvData, setCsvData] = useState<string>('');
  const [loads, setLoads] = useState<Load[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeDriver, setActiveDriver] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvData(text);
        const parsed = parseTransportCsv(text);
        setLoads(parsed);
      };
      reader.readAsText(file);
    }
  };

  const driverStats = useMemo(() => {
    const statsMap: Record<string, DriverChartData> = {};

    loads.forEach((load) => {
      const driver = load.driver;
      if (!statsMap[driver]) {
        statsMap[driver] = {
          driverName: driver,
          loads: [],
          totalKms: 0,
          totalPallets: 0,
          avgTimeBetweenLoadsMinutes: 0,
          avgExpectedTime: 0
        };
      }
      statsMap[driver].loads.push(load);
      statsMap[driver].totalKms += load.totalDistance + load.totalReturnLeg;
      statsMap[driver].totalPallets += load.totalPallets;
    });

    Object.values(statsMap).forEach((stat) => {
      stat.loads.sort((a, b) => {
        const t1 = a.despatchTime.split(':').map(Number);
        const t2 = b.despatchTime.split(':').map(Number);
        return (t1[0] * 60 + (t1[1] || 0)) - (t2[0] * 60 + (t2[1] || 0));
      });

      let totalGap = 0;
      let gapCount = 0;
      for (let i = 0; i < stat.loads.length - 1; i++) {
        const gap = calculateMinutesBetween(stat.loads[i].despatchTime, stat.loads[i + 1].despatchTime);
        totalGap += gap;
        gapCount++;
      }
      stat.avgTimeBetweenLoadsMinutes = gapCount > 0 ? Math.round(totalGap / gapCount) : 0;
      
      const totalExpected = stat.loads.reduce((acc, l) => acc + l.expectedTimeMinutes, 0);
      stat.avgExpectedTime = stat.loads.length > 0 ? totalExpected / stat.loads.length : 0;
    });

    return Object.values(statsMap).sort((a, b) => b.totalKms - a.totalKms);
  }, [loads]);

  const timelineData = useMemo(() => {
    return [...loads]
      .sort((a, b) => {
        const t1 = a.despatchTime.split(':').map(Number);
        const t2 = b.despatchTime.split(':').map(Number);
        return (t1[0] * 60 + (t1[1] || 0)) - (t2[0] * 60 + (t2[1] || 0));
      })
      .map(load => ({
        time: load.despatchTime,
        duration: load.expectedTimeMinutes,
        loadNo: load.loadNo
      }));
  }, [loads]);

  const runAnalysis = async () => {
    if (driverStats.length === 0) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeFleetPerformance(driverStats);
      setAnalysis(result);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totals = useMemo(() => {
    const totalExpected = loads.reduce((acc, curr) => acc + curr.expectedTimeMinutes, 0);
    return {
      loads: loads.length,
      kms: driverStats.reduce((acc, curr) => acc + curr.totalKms, 0),
      drivers: driverStats.length,
      pallets: driverStats.reduce((acc, curr) => acc + curr.totalPallets, 0),
      avgExpectedTime: loads.length > 0 ? totalExpected / loads.length : 0,
    };
  }, [loads, driverStats]);

  const toggleDriver = (driverName: string) => {
    setActiveDriver(prev => prev === driverName ? null : driverName);
  };

  const handleExport = () => {
    // We can also programmatically expand all drivers if we want them in the report
    // But usually print captures current view. 
    window.print();
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
              <Truck size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">FleetOptima</h1>
          </div>
          <div className="flex items-center gap-4">
            {loads.length > 0 && (
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm transition-all text-sm font-bold uppercase tracking-wide group"
              >
                <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                <span>Export Analytics</span>
              </button>
            )}
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors text-sm font-medium">
              <Upload size={16} />
              <span>Upload CSV</span>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </label>
            {loads.length > 0 && (
              <button 
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
              >
                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
                Deep Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-8 space-y-8">
        {!csvData ? (
          <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-300 rounded-2xl bg-white no-print">
            <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <Upload size={32} />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">No data loaded</h2>
            <p className="text-slate-500 max-w-sm text-center mt-2">
              Upload the transport load plan CSV to begin analyzing driver performance and route efficiency.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <DashboardCard title="Total Loads" value={totals.loads} icon={<Truck />} color="bg-white" />
              <DashboardCard title="Avg Load Time" value={formatMinutesToText(totals.avgExpectedTime)} icon={<Hourglass />} color="bg-indigo-50 border-indigo-100" />
              <DashboardCard title="Total Distance" value={`${totals.kms.toFixed(1)} km`} icon={<MapPin />} color="bg-white" />
              <DashboardCard title="Active Drivers" value={totals.drivers} icon={<Users />} color="bg-white" />
              <DashboardCard title="Total Pallets" value={totals.pallets} icon={<TrendingUp />} color="bg-white" />
            </div>

            {analysis && (
              <div id="ai-report" className="bg-indigo-900 text-white rounded-2xl p-8 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 no-print">
                  <BarChart3 size={160} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-indigo-500/30 rounded-full flex items-center justify-center">
                      <TrendingUp size={24} />
                    </div>
                    <h2 className="text-2xl font-bold">Operational Insights</h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <p className="text-indigo-100 text-lg leading-relaxed italic mb-6">"{analysis.summary}"</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="flex items-center gap-2 font-semibold text-indigo-300 mb-3 text-sm uppercase tracking-wider">
                            <AlertCircle size={16} /> Bottlenecks
                          </h4>
                          <ul className="space-y-2">
                            {analysis.bottlenecks.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-indigo-50">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0"></span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="flex items-center gap-2 font-semibold text-indigo-300 mb-3 text-sm uppercase tracking-wider">
                            <TrendingUp size={16} /> Improvements
                          </h4>
                          <ul className="space-y-2">
                            {analysis.recommendations.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-indigo-50">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0"></span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div className="bg-indigo-800/50 p-6 rounded-xl border border-indigo-700/50 flex flex-col items-center justify-center text-center">
                      <div className="text-5xl font-black mb-2">{analysis.efficiencyScore}%</div>
                      <div className="text-indigo-300 text-sm font-medium uppercase tracking-widest">Efficiency Score</div>
                      <div className="w-full bg-indigo-900 h-2 rounded-full mt-6 overflow-hidden no-print">
                        <div className="bg-green-400 h-full" style={{ width: `${analysis.efficiencyScore}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Driver Breakdown Table with In-line Expansion */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h3 className="font-bold text-slate-800">Driver Performance & Timeline</h3>
                <div className="text-xs text-slate-400 uppercase font-bold tracking-widest no-print">Click a row to view driver loads</div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-left border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Loads</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Total KMs</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Avg Dispatch Gap</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right no-print">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverStats.map((stat) => (
                      <React.Fragment key={stat.driverName}>
                        <tr 
                          className={`hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 ${activeDriver === stat.driverName ? 'bg-indigo-50/50' : ''}`}
                          onClick={() => toggleDriver(stat.driverName)}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${activeDriver === stat.driverName ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                <Users size={18} />
                              </div>
                              <div className="font-bold text-slate-900">{stat.driverName}</div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center font-medium text-slate-600">{stat.loads.length}</td>
                          <td className="px-6 py-5 text-center font-medium text-slate-600">{stat.totalKms.toFixed(1)}</td>
                          <td className="px-6 py-5 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${stat.avgTimeBetweenLoadsMinutes > 60 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                              {formatMinutesToHours(stat.avgTimeBetweenLoadsMinutes)}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right no-print">
                            {activeDriver === stat.driverName ? <ChevronUp className="inline text-indigo-600" size={20} /> : <ChevronDown className="inline text-slate-400" size={20} />}
                          </td>
                        </tr>
                        {/* Inline Load Details */}
                        {activeDriver === stat.driverName && (
                          <tr className="bg-slate-50/80 driver-detail-row">
                            <td colSpan={5} className="px-4 py-8 border-b border-indigo-100">
                              <div className="max-w-6xl mx-auto space-y-12">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                                  <div className="flex items-center gap-4">
                                     <div className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl font-bold text-sm border border-indigo-200">
                                       {stat.loads.length} LOADS TOTAL
                                     </div>
                                     <div className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-bold text-sm border border-slate-200">
                                       {stat.totalPallets} PALLETS TOTAL
                                     </div>
                                  </div>
                                </div>
                                
                                {stat.loads.map((load, idx, arr) => (
                                  <div key={load.loadNo} className="relative pl-12">
                                    {idx < arr.length - 1 && (
                                      <div className="absolute left-6 top-10 bottom-[-50px] w-1 bg-indigo-100 -z-0"></div>
                                    )}
                                    <div className="absolute left-3 top-3 w-6 h-6 rounded-full bg-indigo-600 border-4 border-white shadow-md z-10 flex items-center justify-center">
                                      <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                    </div>
                                    
                                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                      <div className="flex flex-wrap justify-between items-start gap-4 mb-6 border-b border-slate-50 pb-6">
                                        <div className="flex flex-wrap items-center gap-3">
                                          <span className="bg-slate-900 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase">Load {load.loadNo}</span>
                                          <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase">Route {load.routeNo}</span>
                                          <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 text-[11px] font-black">
                                            <Clock size={14} className="text-indigo-500" />
                                            DESPATCH: {load.despatchTime}
                                          </div>
                                        </div>
                                        <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-4">
                                           <div className="text-center">
                                              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Expected</div>
                                              <div className="text-base font-black text-indigo-700">{formatMinutesToText(load.expectedTimeMinutes)}</div>
                                           </div>
                                           <div className="w-px h-6 bg-indigo-200"></div>
                                           <div className="text-center">
                                              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Distance</div>
                                              <div className="text-base font-black text-indigo-700">{(load.totalDistance + load.totalReturnLeg).toFixed(1)}km</div>
                                           </div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {/* Start Leg */}
                                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200 flex flex-col justify-center items-center text-center opacity-70">
                                          <Warehouse size={16} className="text-slate-400 mb-1" />
                                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">START</div>
                                          <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight">EPDC</div>
                                        </div>

                                        {load.stops.map((stop) => {
                                          const travelMins = Math.round(stop.distance); // Assuming 1km = 1min
                                          return (
                                            <div key={stop.stopNo} className="p-4 bg-white rounded-2xl border border-slate-200 relative group/stop">
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Stop {stop.stopNo}</div>
                                                <div className="text-[9px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded">#{stop.storeNo}</div>
                                              </div>
                                              <div className="text-xs font-black text-slate-900 mb-3 truncate">{stop.storeName}</div>
                                              <div className="pt-3 border-t border-slate-50 space-y-2">
                                                <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                   <span>{stop.distance.toFixed(1)} km</span>
                                                   <span className="flex items-center gap-1"><Timer size={10} /> {travelMins}m travel</span>
                                                </div>
                                                <div className="flex justify-between text-[9px] font-black text-indigo-500 bg-indigo-50/50 px-2 py-1 rounded-lg">
                                                   <span className="uppercase">Unload Duration</span>
                                                   <span>30m</span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}

                                        {/* Return Leg */}
                                        <div className="p-4 bg-indigo-50/30 rounded-2xl border border-dashed border-indigo-200 flex flex-col justify-center items-center text-center">
                                          <Warehouse size={16} className="text-indigo-400 mb-1" />
                                          <div className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">RETURN</div>
                                          <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight">EPDC</div>
                                          <div className="mt-2 pt-2 border-t border-indigo-100 w-full flex justify-between text-[9px] font-bold text-indigo-400">
                                            <span>{load.totalReturnLeg.toFixed(1)} km</span>
                                            <span>{Math.round(load.totalReturnLeg)}m travel</span>
                                          </div>
                                        </div>
                                      </div>

                                      {idx < arr.length - 1 && (
                                        <div className="mt-6 flex items-center gap-3 p-3 px-5 bg-slate-900 text-white rounded-2xl text-[11px] font-black border border-slate-800 w-fit">
                                          <Clock size={14} className="text-indigo-400" />
                                          TIME BETWEEN LOAD DISPATCHES: {formatMinutesToText(calculateMinutesBetween(load.despatchTime, arr[idx+1].despatchTime))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Load Timing Visualization Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Avg Load Time per Driver */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                      <Hourglass size={24} className="text-indigo-600" />
                      Avg Load Duration per Driver
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Average planned time including travel and unloading.</p>
                  </div>
                </div>
                
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={driverStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="driverName" 
                        fontSize={11} 
                        fontWeight={600} 
                        stroke="#64748b"
                        tickMargin={10}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        fontWeight={600} 
                        tickFormatter={(val) => `${val}m`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: number) => [`${val.toFixed(0)} mins`, 'Avg Duration']}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="avgExpectedTime" radius={[6, 6, 0, 0]}>
                        {driverStats.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={activeDriver === entry.driverName ? '#4f46e5' : '#818cf8'} 
                            fillOpacity={activeDriver && activeDriver !== entry.driverName ? 0.4 : 1}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dispatch Timeline */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                      <LineChartIcon size={24} className="text-indigo-600" />
                      Dispatch Timeline Efficiency
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Expected load durations across the day by dispatch time.</p>
                  </div>
                </div>
                
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData}>
                      <defs>
                        <linearGradient id="colorDuration" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="time" 
                        fontSize={10} 
                        fontWeight={700} 
                        stroke="#94a3b8"
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        fontWeight={600}
                        tickFormatter={(val) => `${val}m`}
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: number) => [`${val} mins`, 'Expected Time']}
                        labelFormatter={(label) => `Dispatch: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="duration" 
                        stroke="#4f46e5" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorDuration)" 
                        animationDuration={1500}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default App;

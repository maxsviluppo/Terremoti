import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';
import { EarthquakeFeature } from '../types';

interface ChartSectionProps {
  data: EarthquakeFeature[];
  title?: string;
  onClose: () => void;
}

const ChartSection: React.FC<ChartSectionProps> = ({ data, title, onClose }) => {
  // 1. Prepare Data: Count per day
  const groupedData = data.reduce((acc, curr) => {
    const date = new Date(curr.properties.time).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
    if (!acc[date]) {
      acc[date] = { date, count: 0, maxMag: 0 };
    }
    acc[date].count += 1;
    acc[date].maxMag = Math.max(acc[date].maxMag, curr.properties.mag);
    return acc;
  }, {} as Record<string, { date: string; count: number; maxMag: number }>);

  const chartData = Object.values(groupedData).reverse();

  // 2. Magnitude Distribution
  const magDist = data.reduce((acc, curr) => {
    const mag = Math.floor(curr.properties.mag);
    const key = `${mag}-${mag + 1}`;
    if (!acc[key]) acc[key] = { range: key, count: 0 };
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { range: string; count: number }>);

  const magChartData = (Object.values(magDist) as { range: string; count: number }[]).sort((a, b) => a.range.localeCompare(b.range));

  // Stats
  const maxMagEvent = data.length > 0 ? data.reduce((prev, current) => (prev.properties.mag > current.properties.mag) ? prev : current) : null;
  const avgMag = data.length > 0 ? (data.reduce((acc, curr) => acc + curr.properties.mag, 0) / data.length).toFixed(1) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
       <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-slide-up">
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 sticky top-0">
          <div>
            <h3 className="font-bold text-lg text-slate-800">Analisi Sismica</h3>
            <p className="text-sm text-slate-500">{title || "Ultimi 3 giorni"}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-blue-600 font-semibold text-sm">Totale Eventi</p>
                    <p className="text-3xl font-bold text-blue-900">{data.length}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <p className="text-red-600 font-semibold text-sm">Max Magnitudo</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-red-900">{maxMagEvent?.properties.mag.toFixed(1)}</p>
                        <span className="text-xs text-red-700 truncate max-w-[120px]">{maxMagEvent?.properties.place}</span>
                    </div>
                </div>
                 <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                    <p className="text-purple-600 font-semibold text-sm">Media Magnitudo</p>
                    <p className="text-3xl font-bold text-purple-900">{avgMag}</p>
                </div>
            </div>

            {/* Timeline Chart */}
            <div className="h-64 w-full">
                <h4 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider">Eventi per Giorno</h4>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{fontSize: 12}} />
                    <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                    <Tooltip 
                        contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCount)" name="Numero Eventi" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Magnitude Distribution Chart */}
            <div className="h-64 w-full">
                 <h4 className="text-sm font-bold text-slate-600 mb-4 uppercase tracking-wider">Distribuzione Magnitudo</h4>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={magChartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="range" tick={{fontSize: 12}} label={{ value: 'Magnitudo', position: 'insideBottom', offset: -5 }} />
                        <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="count" fill="#fb923c" radius={[4, 4, 0, 0]} name="Eventi" />
                    </BarChart>
                 </ResponsiveContainer>
            </div>

        </div>
       </div>
    </div>
  );
};

export default ChartSection;
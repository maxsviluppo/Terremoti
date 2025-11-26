import React from 'react';
import { EarthquakeFeature } from '../types';

interface Props {
  data: EarthquakeFeature;
  onClick: (data: EarthquakeFeature) => void;
}

const EarthquakeCard: React.FC<Props> = ({ data, onClick }) => {
  const { mag, place, time, type } = data.properties;
  const depth = data.geometry.coordinates[2];

  // Helper for color coding magnitude
  const getMagColor = (m: number) => {
    if (m < 2.0) return "text-emerald-500 bg-emerald-50 border-emerald-100";
    if (m < 3.0) return "text-lime-600 bg-lime-50 border-lime-100";
    if (m < 4.0) return "text-amber-500 bg-amber-50 border-amber-100";
    if (m < 5.0) return "text-orange-600 bg-orange-50 border-orange-100";
    return "text-red-600 bg-red-50 border-red-100 animate-pulse";
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const getRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 60) return `${minutes} min fa`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h fa`;
    return `${Math.floor(hours / 24)} gg fa`;
  };

  const cleanPlace = (p: string) => {
    // Remove "1 km S" or similar prefixes commonly found in INGV data
    return p.replace(/^\d+\s?km\s[A-Z]+\s/, '');
  };

  return (
    <div 
      onClick={() => onClick(data)}
      className="group bg-white rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer active:scale-[0.98] flex items-center justify-between gap-4"
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-slate-800 text-sm md:text-base truncate group-hover:text-blue-600 transition-colors">
            {cleanPlace(place)}
        </h4>
        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 font-medium">
             <span className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                {depth.toFixed(0)} km
             </span>
             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
             <span>{type === 'earthquake' ? 'Terremoto' : type}</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className={`flex items-center justify-center w-12 h-12 rounded-lg border-2 ${getMagColor(mag)}`}>
            <span className="text-xl font-bold tracking-tighter">{mag.toFixed(1)}</span>
        </div>
        <div className="text-right">
            <div className="text-xs font-bold text-slate-700">{formatTime(time)}</div>
            <div className="text-[10px] text-slate-400">{getRelativeTime(time)}</div>
        </div>
      </div>
    </div>
  );
};

export default EarthquakeCard;

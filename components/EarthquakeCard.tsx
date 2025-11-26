
import React, { useState, useRef, useEffect } from 'react';
import { EarthquakeFeature } from '../types';

interface Props {
  data: EarthquakeFeature;
  onClick: (data: EarthquakeFeature) => void;
  onFilter: (place: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  activeFilter?: string;
  isFirst?: boolean;
  timeSincePrevious?: string | null;
}

// Calculate distance util (simplified version for display)
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const EarthquakeCard: React.FC<Props> = ({ data, onClick, onFilter, userLocation, activeFilter, isFirst, timeSincePrevious }) => {
  const { mag, place, time, type } = data.properties;
  const depth = data.geometry.coordinates[2];
  const [lng, lat] = data.geometry.coordinates;

  // Swipe State
  const [offsetX, setOffsetX] = useState(0);
  const [animOffset, setAnimOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const swipeThreshold = -80; // Distance to trigger action

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
    // Rimuove prefissi come "2 km E" o "10 km SW" mantenendo il nome della località
    return p.replace(/^\d+\s?km\s[A-Z]+\s/, '').trim();
  };

  const placeName = cleanPlace(place);
  const isFiltered = activeFilter?.toLowerCase() === placeName.toLowerCase();
  const distanceFromUser = userLocation 
    ? getDistanceKm(userLocation.lat, userLocation.lng, lat, lng).toFixed(1) 
    : null;

  // Hint Animation Effect
  useEffect(() => {
    if (!isFirst) return;

    const interval = setInterval(() => {
        if (!isDragging) {
            setAnimOffset(-40); // Slide left
            setTimeout(() => {
                setAnimOffset(0); // Slide back
            }, 600);
        }
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [isFirst, isDragging]);

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(false);
    setAnimOffset(0); // Stop animation if interaction starts
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Only allow swipe left (negative) and limit to -150px
    if (diff < 0 && diff > -150) {
        setOffsetX(diff);
        setIsDragging(true);
    }
  };

  const handleTouchEnd = () => {
    if (offsetX < swipeThreshold) {
       onFilter(placeName);
    }
    setOffsetX(0);
    startX.current = null;
    // Small delay to allow click event logic to know if it was a drag
    setTimeout(() => setIsDragging(false), 100);
  };

  // Determine final transform value (drag takes precedence over animation)
  const currentTransform = isDragging ? offsetX : animOffset;

  return (
    <div className="relative overflow-hidden rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      
      {/* Background Action Layer */}
      <div className={`absolute inset-0 flex items-center justify-end px-6 transition-colors duration-300 ${isFiltered ? 'bg-slate-200' : 'bg-emerald-100'}`}>
         <div className="flex flex-col items-center justify-center text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
            {isFiltered ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    Reset
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    Filtra
                </>
            )}
         </div>
      </div>

      {/* Card Content */}
      <div 
        onClick={() => !isDragging && onClick(data)}
        className="relative bg-white p-4 cursor-pointer active:scale-[0.98] flex items-center justify-between gap-4 touch-pan-y z-10"
        style={{ 
            transform: `translateX(${currentTransform}px)`,
            transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex-1 min-w-0">
          <h4 className={`font-bold text-lg md:text-xl truncate transition-colors ${isFiltered ? 'text-emerald-500' : 'text-emerald-700'}`}>
              {placeName}
          </h4>
          
          {/* Info Rows */}
          <div className="flex flex-col gap-1 mt-1">
            {/* Row 1: Depth, Type, Distance */}
            <div className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1" title="Profondità">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                    {depth.toFixed(0)} km prof.
                </span>
                {distanceFromUser && (
                    <>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                        A {distanceFromUser} km da te
                    </span>
                    </>
                )}
                {!distanceFromUser && (
                    <>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span>{type === 'earthquake' ? 'Terremoto' : type}</span>
                    </>
                )}
            </div>

            {/* Row 2: Time Difference */}
            {timeSincePrevious && (
                 <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m4.9 19.1 2.9-2.9"/><path d="M2 12h4"/><path d="m4.9 4.9 2.9 2.9"/></svg>
                    <span>+{timeSincePrevious} dalla prec.</span>
                 </div>
            )}
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
    </div>
  );
};

export default EarthquakeCard;

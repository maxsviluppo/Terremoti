
import React, { useState, useRef, useEffect } from 'react';
import { EarthquakeFeature } from '../types';

interface Props {
  data: EarthquakeFeature;
  onClick: (data: EarthquakeFeature) => void;
  onFilter: (place: string) => void;
  onShare: (data: EarthquakeFeature) => void;
  userLocation?: { lat: number; lng: number } | null;
  activeFilter?: string;
  isFirst?: boolean;
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

const EarthquakeCard: React.FC<Props> = ({ data, onClick, onFilter, onShare, userLocation, activeFilter, isFirst }) => {
  const { mag, place, time, type } = data.properties;
  const depth = data.geometry.coordinates[2];
  const [lng, lat] = data.geometry.coordinates;

  // Swipe State
  const [offsetX, setOffsetX] = useState(0);
  const [animOffset, setAnimOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef<number | null>(null);
  
  // Adjusted thresholds for easier activation (Left/Right)
  const filterThreshold = -50; // Swipe Left to Filter
  const shareThreshold = 50;   // Swipe Right to Share
  const maxVisualOffset = 120; // Cap visual movement

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
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });
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
    return p.replace(/^\d+\s?km\s[A-Z]+\s/, '').trim();
  };

  const placeName = cleanPlace(place);
  const isFiltered = activeFilter?.toLowerCase() === placeName.toLowerCase();
  const distanceFromUser = userLocation 
    ? getDistanceKm(userLocation.lat, userLocation.lng, lat, lng).toFixed(1) 
    : null;

  // Hint Animation Effect (Left and Right)
  useEffect(() => {
    if (!isFirst) return;

    const interval = setInterval(() => {
        if (!isDragging) {
            // Sequence: Left -> Center -> Right -> Center
            setAnimOffset(-25); // Slide left
            setTimeout(() => {
                setAnimOffset(0); // Slide back
                setTimeout(() => {
                    setAnimOffset(25); // Slide right
                    setTimeout(() => {
                        setAnimOffset(0); // Slide back
                    }, 500);
                }, 500);
            }, 500);
        }
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [isFirst, isDragging]);

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(false);
    setAnimOffset(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    setOffsetX(diff);
    setIsDragging(true);
  };

  const handleTouchEnd = () => {
    if (isDragging && startX.current !== null) {
      // Check Filter Threshold (Left)
      if (offsetX < filterThreshold) {
         if (navigator.vibrate) navigator.vibrate(50);
         onFilter(placeName);
      } 
      // Check Share Threshold (Right)
      else if (offsetX > shareThreshold) {
          if (navigator.vibrate) navigator.vibrate(50);
          onShare(data);
      }
    }

    setOffsetX(0);
    startX.current = null;
    setTimeout(() => setIsDragging(false), 50);
  };

  // Determine final transform value
  let visualX = isDragging ? offsetX : animOffset;
  
  // Clamp visually
  if (visualX > maxVisualOffset) visualX = maxVisualOffset + (visualX - maxVisualOffset) * 0.2; 
  if (visualX < -maxVisualOffset) visualX = -maxVisualOffset + (visualX + maxVisualOffset) * 0.2; 
  
  // Visual States
  const isSwipingRight = visualX > 0;
  const isSwipingLeft = visualX < 0;

  // Opacity calculation (0 to 1)
  const leftOpacity = Math.min(Math.abs(Math.min(0, visualX)) / Math.abs(filterThreshold), 1);
  const rightOpacity = Math.min(Math.max(0, visualX) / shareThreshold, 1);

  return (
    <div className="relative overflow-hidden rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow select-none">
      
      {/* Background Action Layer - FILTER (Left Swipe) */}
      <div 
        className={`absolute inset-0 flex items-center justify-end px-6 transition-colors duration-200 ${isFiltered ? 'bg-slate-200' : 'bg-emerald-100'}`}
        style={{ opacity: isSwipingLeft ? leftOpacity : 0 }}
      >
         <div className="flex flex-col items-center justify-center text-emerald-800 font-bold text-[10px] uppercase tracking-wider scale-110">
            {isFiltered ? (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    Reset
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                    Filtra
                </>
            )}
         </div>
      </div>

      {/* Background Action Layer - SHARE (Right Swipe) */}
      <div 
        className="absolute inset-0 flex items-center justify-start px-6 transition-colors duration-200 bg-sky-100"
        style={{ opacity: isSwipingRight ? rightOpacity : 0 }}
      >
         <div className="flex flex-col items-center justify-center text-sky-800 font-bold text-[10px] uppercase tracking-wider scale-110">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
            Condividi
         </div>
      </div>

      {/* Card Content */}
      <div 
        onClick={() => !isDragging && onClick(data)}
        className="relative bg-white p-4 cursor-pointer active:scale-[0.98] flex items-center justify-between gap-4 touch-pan-y z-10"
        style={{ 
            transform: `translateX(${visualX}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h4 className={`font-bold text-lg md:text-xl truncate transition-colors ${isFiltered ? 'text-emerald-500' : 'text-emerald-700'}`}>
              {placeName}
          </h4>
          
          {/* Info Rows */}
          <div className="flex flex-col gap-1 mt-1.5">
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
                        A {distanceFromUser} km
                    </span>
                    </>
                )}
                {!distanceFromUser && type !== 'earthquake' && (
                    <>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span>{type}</span>
                    </>
                )}
            </div>

            {/* Row 2: Time (Moved from right side) */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span className="flex items-center gap-1 font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {formatTime(time)}
                </span>
                <span className="text-slate-300">•</span>
                <span>{getRelativeTime(time)}</span>
            </div>
          </div>
        </div>

        {/* Right Side - Bigger Magnitude Box */}
        <div className="pl-2 shrink-0">
          <div className={`flex items-center justify-center w-16 h-16 rounded-2xl border-2 ${getMagColor(mag)} shadow-sm`}>
              <span className="text-2xl font-black tracking-tighter">{mag.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarthquakeCard;

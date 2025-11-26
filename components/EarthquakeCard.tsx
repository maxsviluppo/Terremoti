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

// Calculate distance util
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
  
  const filterThreshold = -80; // Swipe Left Threshold (Filter)
  const shareThreshold = 80;   // Swipe Right Threshold (Share)

  // Calculate distance if user location is available
  const distanceFromUser = userLocation 
    ? getDistanceKm(userLocation.lat, userLocation.lng, lat, lng) 
    : null;

  // Helper for color coding magnitude
  const getMagColor = (m: number) => {
    if (m < 2.0) return "text-emerald-500 border-emerald-100";
    if (m < 3.0) return "text-lime-600 border-lime-100";
    if (m < 4.0) return "text-amber-500 border-amber-100";
    if (m < 5.0) return "text-orange-600 border-orange-100";
    return "text-red-600 border-red-100 animate-pulse";
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
    // Rimuove prefissi come "2 km E" o "10 km SW" mantenendo il nome della località
    return p.replace(/^\d+\s?km\s[A-Z]+\s/, '').trim();
  };

  const placeName = cleanPlace(place);
  const isFiltered = activeFilter?.toLowerCase() === placeName.toLowerCase();

  // Swipe Logic
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    
    // Limit swipe range
    if (diff > 120) setOffsetX(120);
    else if (diff < -120) setOffsetX(-120);
    else setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    if (offsetX < filterThreshold) {
      // Trigger Filter
      onFilter(placeName);
    } else if (offsetX > shareThreshold) {
      // Trigger Share
      onShare(data);
    }
    
    setOffsetX(0);
    setIsDragging(false);
    startX.current = null;
  };

  // Hint Animation
  useEffect(() => {
    if (isFirst) {
      const interval = setInterval(() => {
        // Sequenza: Centro -> Sinistra -> Centro -> Destra -> Centro
        setAnimOffset(-30);
        setTimeout(() => setAnimOffset(0), 400);
        setTimeout(() => setAnimOffset(30), 800);
        setTimeout(() => setAnimOffset(0), 1200);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isFirst]);

  const currentOffset = isDragging ? offsetX : animOffset;

  return (
    <div className="relative overflow-hidden rounded-xl h-[88px] select-none shadow-sm shadow-emerald-100/50">
      
      {/* Background Actions Layer */}
      <div className="absolute inset-0 flex justify-between items-center px-6">
        {/* Share Action (Left side visible when swiping right) */}
        <div 
          className={`flex items-center gap-2 font-bold transition-all duration-300 ${offsetX > 0 ? 'opacity-100' : 'opacity-0'}`}
        >
           <div className={`p-2 rounded-full ${offsetX > shareThreshold ? 'bg-blue-600 text-white scale-125' : 'bg-blue-100 text-blue-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/></svg>
           </div>
           <span className="text-blue-600 text-xs uppercase tracking-wider">Condividi</span>
        </div>

        {/* Filter Action (Right side visible when swiping left) */}
        <div 
          className={`flex items-center gap-2 font-bold transition-all duration-300 ${offsetX < 0 ? 'opacity-100' : 'opacity-0'}`}
        >
           <span className="text-emerald-600 text-xs uppercase tracking-wider">{isFiltered ? 'Reset' : 'Filtra'}</span>
           <div className={`p-2 rounded-full ${offsetX < filterThreshold ? 'bg-emerald-600 text-white scale-125' : 'bg-emerald-100 text-emerald-600'}`}>
              {isFiltered ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              )}
           </div>
        </div>
      </div>

      {/* Main Card Content */}
      <div 
        className="relative bg-gradient-to-br from-green-50 to-emerald-100 border border-emerald-100 p-3 h-full flex items-center justify-between transition-transform duration-300 ease-out active:scale-[0.98]"
        style={{ transform: `translateX(${currentOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => !isDragging && Math.abs(offsetX) < 5 && onClick(data)}
      >
        {/* Left: Info */}
        <div className="flex-1 min-w-0 pr-2">
            <h3 className="font-bold text-slate-800 text-lg truncate leading-tight">
                {placeName}
            </h3>
            <div className="flex items-center gap-2 mt-1 text-slate-500 text-xs font-medium">
                <span className="flex items-center gap-1 bg-white/60 px-1.5 py-0.5 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {depth.toFixed(1)} km
                </span>
                
                {distanceFromUser !== null && (
                    <span className="flex items-center gap-1 bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        a {distanceFromUser.toFixed(0)} km
                    </span>
                )}

                {type !== 'earthquake' && (
                  <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded uppercase text-[10px] tracking-wide">
                    {type}
                  </span>
                )}
            </div>
        </div>

        {/* Right: Data */}
        <div className="flex items-center gap-3 pl-3 border-l border-emerald-200/50">
            <div className="text-right">
                <div className="text-sm font-bold text-slate-700">{formatTime(time)}</div>
                <div className="text-[10px] text-slate-400 font-medium">{getRelativeTime(time)}</div>
            </div>
            
            <div className={`w-12 h-12 flex items-center justify-center rounded-lg bg-white border-2 shadow-sm ${getMagColor(mag)}`}>
                <span className="font-black text-xl tracking-tighter">{mag.toFixed(1)}</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default EarthquakeCard;
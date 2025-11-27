
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { fetchEarthquakes } from './services/ingvService';
import { EarthquakeFeature } from './types';
import EarthquakeCard from './components/EarthquakeCard';
import ChartSection from './components/ChartSection';
import MapViewer from './components/MapViewer';
import SettingsModal, { NotificationMode } from './components/SettingsModal';
import InfoModal from './components/InfoModal';

// Haversine formula to calculate distance between two points in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// Synth Alarm Sound Generator
let globalAudioCtx: AudioContext | null = null;

const playAlarmSound = (volume: number) => {
  try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      if (!globalAudioCtx) {
          globalAudioCtx = new AudioContext();
      }
      
      // Always try to resume context (crucial for browsers blocking autoplay)
      if (globalAudioCtx.state === 'suspended') {
          globalAudioCtx.resume().catch(e => console.log("Audio resume failed (no gesture)", e));
      }

      const ctx = globalAudioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      // Siren Effect
      osc.type = 'triangle';
      const now = ctx.currentTime;
      
      osc.frequency.setValueAtTime(880, now); 
      osc.frequency.linearRampToValueAtTime(440, now + 0.3); 
      osc.frequency.setValueAtTime(880, now + 0.3); 
      osc.frequency.linearRampToValueAtTime(440, now + 0.6); 
      
      // Use dynamic volume
      gain.gain.setValueAtTime(volume, now); 
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.start(now);
      osc.stop(now + 0.8);
  } catch (e) {
      console.error("Audio alarm failed", e);
  }
};

function App() {
  const [data, setData] = useState<EarthquakeFeature[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>('');
  const [showChart, setShowChart] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showInfo, setShowInfo] = useState<boolean>(false);
  const [selectedEarthquake, setSelectedEarthquake] = useState<EarthquakeFeature | null>(null);
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  
  // Alert Banner State
  const [activeAlert, setActiveAlert] = useState<EarthquakeFeature | null>(null);
  
  // Geolocation states
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [searchRadius] = useState<number>(50); // Fixed 50km radius
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Notification States
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  const [minAlertMag, setMinAlertMag] = useState<number>(2.0);
  const [notifMode, setNotifMode] = useState<NotificationMode>('global');
  const [notifCity, setNotifCity] = useState<string>('');
  const [notifRadius, setNotifRadius] = useState<number>(50);
  const [alarmVolume, setAlarmVolume] = useState<number>(0.5); // Default 50%
  
  // Track the timestamp of the latest known earthquake to detect NEW ones.
  // Initialized to null to identify first load.
  const latestEventTimeRef = useRef<number | null>(null);

  useEffect(() => {
    const storedNotif = localStorage.getItem('notificationsEnabled');
    if (storedNotif) setNotificationsEnabled(JSON.parse(storedNotif));

    const storedMag = localStorage.getItem('minAlertMag');
    if (storedMag) setMinAlertMag(parseFloat(storedMag));

    const storedMode = localStorage.getItem('notifMode');
    if (storedMode) setNotifMode(storedMode as NotificationMode);

    const storedCity = localStorage.getItem('notifCity');
    if (storedCity) setNotifCity(storedCity);
    
    const storedRadius = localStorage.getItem('notifRadius');
    if (storedRadius) setNotifRadius(parseInt(storedRadius));

    const storedVolume = localStorage.getItem('alarmVolume');
    if (storedVolume) setAlarmVolume(parseFloat(storedVolume));
    
    // Unlock Audio Context on first user interaction
    const unlockAudio = () => {
        if (!globalAudioCtx) {
             const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
             if (AudioContext) globalAudioCtx = new AudioContext();
        }
        if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
            globalAudioCtx.resume();
        }
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    
    return () => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled));
    localStorage.setItem('minAlertMag', minAlertMag.toString());
    localStorage.setItem('notifMode', notifMode);
    localStorage.setItem('notifCity', notifCity);
    localStorage.setItem('notifRadius', notifRadius.toString());
    localStorage.setItem('alarmVolume', alarmVolume.toString());
  }, [notificationsEnabled, minAlertMag, notifMode, notifCity, notifRadius, alarmVolume]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); 
    return () => clearInterval(interval);
  }, [notificationsEnabled, minAlertMag, notifMode, notifCity, notifRadius, userLocation, alarmVolume]);

  const checkNotifications = (newEvents: EarthquakeFeature[]) => {
    if (!notificationsEnabled) return;

    let triggered = false;
    let latestEvent: EarthquakeFeature | null = null;

    newEvents.forEach(event => {
      const mag = event.properties.mag;
      const place = event.properties.place.toLowerCase();
      
      if (mag < minAlertMag) return;

      let shouldNotify = false;

      if (notifMode === 'global') {
          shouldNotify = true;
      } else if (notifMode === 'gps' && userLocation) {
          const [lng, lat] = event.geometry.coordinates;
          const dist = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
          if (dist <= notifRadius) shouldNotify = true;
      } else if (notifMode === 'city' && notifCity.trim() !== '') {
          const targets = notifCity.toLowerCase().split(',').map(s => s.trim()).filter(s => s);
          if (targets.some(target => place.includes(target))) {
              shouldNotify = true;
          }
      }

      if (shouldNotify) {
        triggered = true;
        latestEvent = event;
        
        if (Notification.permission === "granted") {
            try {
                new Notification(`Terremoto: ${event.properties.place}`, {
                    body: `Magnitudo ${mag.toFixed(1)} - Profondità ${event.geometry.coordinates[2]}km`,
                    icon: "./vite.svg",
                    vibrate: [200, 100, 200], // Vibration pattern
                    tag: 'seismo-alert', // Avoids stacking too many notifications
                    renotify: true // Notify again even if existing
                } as any);
            } catch(e) { console.log(e); }
        }
      }
    });

    if (triggered) {
        playAlarmSound(alarmVolume);
        if (latestEvent) {
            setActiveAlert(latestEvent);
            setTimeout(() => setActiveAlert(null), 8000);
        }
    }
  };

  const loadData = async () => {
    try {
      const result = await fetchEarthquakes(3); 
      
      // Calculate the most recent timestamp in the fetched data
      const currentMaxTime = result.features.length > 0 
        ? Math.max(...result.features.map(f => f.properties.time)) 
        : 0;

      if (latestEventTimeRef.current === null) {
          // First Load: Just sync the time, don't notify for everything existing
          latestEventTimeRef.current = currentMaxTime;
      } else {
          // Subsequent Loads: Check for any event strictly newer than what we saw last time
          const newEvents = result.features.filter(f => f.properties.time > latestEventTimeRef.current!);
          
          if (newEvents.length > 0) {
              checkNotifications(newEvents);
              latestEventTimeRef.current = currentMaxTime;
          }
      }

      setData(result.features);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeolocation = () => {
    if (userLocation) {
      setUserLocation(null);
      return;
    }
    triggerGeolocation();
  };

  const triggerGeolocation = (retryLowAccuracy = false) => {
    setIsLocating(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Geolocalizzazione non supportata.");
      setIsLocating(false);
      return;
    }

    const options = {
        enableHighAccuracy: !retryLowAccuracy,
        timeout: 15000,
        maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLoc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(newLoc);
        setIsLocating(false);
        setFilterText(''); 
      },
      (error) => {
        console.error("Error getting location:", error);
        
        // Retry with low accuracy if timeout occurs
        if (!retryLowAccuracy && error.code === error.TIMEOUT) {
            console.log("High accuracy timed out, retrying with low accuracy...");
            triggerGeolocation(true);
            return;
        }

        let errorMsg = "Errore rilevazione posizione.";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = "Permesso GPS negato.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = "Posizione non disponibile.";
            break;
          case error.TIMEOUT:
            errorMsg = "Timeout richiesta GPS.";
            break;
        }
        setGeoError(errorMsg);
        setIsLocating(false);
      },
      options
    );
  }

  const toggleFilter = (text: string) => {
    if (filterText === text) {
        setFilterText(''); 
    } else {
        setFilterText(text); 
        setUserLocation(null); 
    }
  };

  const handleSwipeFilter = (place: string) => {
      if (filterText.toLowerCase() === place.toLowerCase()) {
          setFilterText(''); 
          setUserLocation(null);
      } else {
          setFilterText(place);
          setUserLocation(null);
      }
  };

  const handleShare = async (event: EarthquakeFeature) => {
      const { mag, place, time } = event.properties;
      const depth = event.geometry.coordinates[2];
      const dateStr = new Date(time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      
      const shareData = {
          title: `Terremoto`,
          text: `Scossa: ${place}\nMag: ${mag.toFixed(1)} - Prof: ${depth}km\n${dateStr}`,
          url: window.location.href
      };

      try {
          if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
              await navigator.share(shareData);
          } else {
              throw new Error("Share API unavailable or validation failed");
          }
      } catch (err) {
          // Fallback Clipboard
          const fullText = `🔴 TERREMOTO RILEVATO\n\n📍 ${place}\n📉 Magnitudo: ${mag.toFixed(1)}\n⬇️ Profondità: ${depth} km\n🕒 Orario: ${dateStr}\n\nDati INGV`;
          try {
            await navigator.clipboard.writeText(fullText);
            // No prompt, silent fallback or simple alert
            alert("Info copiate!");
          } catch (clipboardErr) {
             console.error("Clipboard copy failed");
          }
      }
  };

  const filteredData = useMemo(() => {
    let filtered = data;

    if (userLocation) {
        filtered = filtered.filter(f => {
            const [lng, lat] = f.geometry.coordinates;
            const dist = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
            return dist <= searchRadius;
        });
    } else if (filterText) {
      filtered = filtered.filter(f => 
        f.properties.place.toLowerCase().includes(filterText.toLowerCase())
      );
    }
    
    return filtered;
  }, [data, filterText, userLocation, searchRadius]);

  const groupedEvents = useMemo(() => {
    const today = new Date().toLocaleDateString('it-IT');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('it-IT');

    const groups: { [key: string]: EarthquakeFeature[] } = {};

    filteredData.forEach(event => {
        const date = new Date(event.properties.time).toLocaleDateString('it-IT');
        let groupName = date;
        if (date === today) groupName = "OGGI";
        else if (date === yesterday) groupName = "IERI";
        
        if (!groups[groupName]) groups[groupName] = [];
        groups[groupName].push(event);
    });

    return Object.entries(groups).sort((a, b) => {
        if (a[0] === "OGGI") return -1;
        if (b[0] === "OGGI") return 1;
        if (a[0] === "IERI") return -1;
        if (b[0] === "IERI") return 1;
        return b[0].localeCompare(a[0]);
    });
  }, [filteredData]);

  const handleCardClick = (feature: EarthquakeFeature) => {
    setSelectedEarthquake(feature);
    setIsMapOpen(true);
  };

  return (
    <div className="min-h-screen bg-emerald-50 text-slate-800 font-sans pb-10">
      
      {/* IN-APP ALERT BANNER */}
      <div className={`fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white shadow-xl transition-transform duration-500 ease-in-out px-4 py-3 flex items-center gap-3 ${activeAlert ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="bg-white/20 p-2 rounded-full animate-pulse shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div className="flex-1">
            <p className="font-bold uppercase text-sm tracking-wider">Nuovo Terremoto Rilevato</p>
            <p className="text-sm font-medium">{activeAlert?.properties.place} - M{activeAlert?.properties.mag.toFixed(1)}</p>
        </div>
        <button onClick={() => setActiveAlert(null)} className="p-1 hover:bg-white/20 rounded">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-emerald-900 leading-none">TERREMOTI</h1>
            <p className="text-xs font-semibold text-emerald-600/80 mt-1 tracking-wide">Terremoti in tempo reale</p>
          </div>
          <div className="flex gap-2">
            
            <button 
              onClick={() => setShowSettings(true)}
              className={`p-2 rounded-full transition-all duration-300 ${
                  notificationsEnabled 
                  ? 'bg-yellow-400 text-yellow-900 shadow-lg shadow-yellow-200 ring-2 ring-yellow-100' 
                  : 'hover:bg-emerald-200 text-emerald-800'
              }`}
              title="Impostazioni Notifiche"
            >
              {notificationsEnabled ? (
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              ) : (
                 <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /><path d="M4 2C2.8 3.7 2 5.7 2 8"/><path d="M22 8c0-2.3-.8-4.3-2-6"/></svg>
              )}
            </button>
            <button 
              onClick={() => setShowChart(true)} 
              className="p-2 hover:bg-emerald-200 rounded-full transition-colors text-emerald-800"
              title="Statistiche"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </button>
             <button 
              onClick={() => setShowInfo(true)} 
              className="p-2 hover:bg-emerald-200 rounded-full transition-colors text-emerald-800"
              title="Info"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </button>
          </div>
        </div>

        {/* Filters & Location */}
        <div className="flex gap-2 mb-6">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Cerca località..." 
              value={filterText}
              onChange={(e) => {
                setFilterText(e.target.value);
                setUserLocation(null);
              }}
              className="w-full pl-10 pr-4 py-3 rounded-xl border-none shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none text-slate-700 bg-white"
            />
            <svg className="absolute left-3 top-3.5 text-slate-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            {filterText && (
                <button onClick={() => setFilterText('')} className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            )}
          </div>
          
          <button 
            onClick={handleGeolocation}
            className={`p-3 rounded-xl shadow-sm transition-all ${userLocation ? 'bg-emerald-600 text-white shadow-emerald-200' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
            title="Dintorni a me"
          >
            {isLocating ? (
                 <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
            )}
          </button>
          
          <button
            onClick={() => {
                setSelectedEarthquake(null);
                setIsMapOpen(true);
            }}
             className="p-3 bg-white text-slate-500 hover:bg-slate-50 rounded-xl shadow-sm transition-colors"
             title="Apri Mappa"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
          </button>
        </div>

        {/* Geo Error */}
        {geoError && (
             <div className="mb-4 bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex justify-between items-center animate-fade-in">
                <span>{geoError}</span>
                <button onClick={() => setGeoError(null)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
        )}

        {/* Content List */}
        {loading ? (
          <div className="space-y-4">
             {[...Array(5)].map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 animate-pulse flex justify-between gap-4">
                    <div className="flex-1 space-y-3">
                        <div className="h-5 bg-slate-200 rounded w-3/4"></div>
                        <div className="flex gap-2">
                            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                        </div>
                    </div>
                    <div className="w-16 h-16 bg-slate-200 rounded-2xl"></div>
                </div>
             ))}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
             <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 16s-1.5-2-4-2-4 2-4 2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
             </div>
             <p className="font-bold">Nessun terremoto trovato.</p>
             <p className="text-sm">Prova a cambiare filtri.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedEvents.map(([groupName, events]) => (
                <div key={groupName} className="animate-slide-up relative pt-4">
                    {/* Visual Separator */}
                    <div className="flex items-center justify-center gap-3 mb-4 sticky top-0 bg-emerald-50 py-2 z-10">
                        <div className="h-px bg-emerald-200 flex-1"></div>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full shadow-sm uppercase tracking-widest border border-emerald-200">
                            {groupName}
                        </span>
                        <div className="h-px bg-emerald-200 flex-1"></div>
                    </div>
                    
                    <div className="space-y-3">
                        {events.map((event, index) => (
                            <EarthquakeCard 
                                key={event.id} 
                                data={event} 
                                onClick={handleCardClick}
                                onFilter={toggleFilter}
                                onShare={handleShare}
                                userLocation={userLocation}
                                activeFilter={filterText}
                                isFirst={index === 0 && groupName === "OGGI"}
                            />
                        ))}
                    </div>
                </div>
            ))}
          </div>
        )}

      </div>

      {/* MODALS */}
      {showChart && <ChartSection data={filteredData} onClose={() => setShowChart(false)} />}
      
      {showSettings && (
        <SettingsModal 
            isOpen={showSettings} 
            onClose={() => setShowSettings(false)} 
            notificationsEnabled={notificationsEnabled}
            setNotificationsEnabled={setNotificationsEnabled}
            minAlertMag={minAlertMag}
            setMinAlertMag={setMinAlertMag}
            notifMode={notifMode}
            setNotifMode={setNotifMode}
            notifCity={notifCity}
            setNotifCity={setNotifCity}
            notifRadius={notifRadius}
            setNotifRadius={setNotifRadius}
            userLocation={userLocation}
            onRequestLocation={handleGeolocation}
            isLocating={isLocating}
            geoError={geoError}
            alarmVolume={alarmVolume}
            setAlarmVolume={setAlarmVolume}
            onTestSound={() => playAlarmSound(alarmVolume)}
        />
      )}

      {showInfo && <InfoModal isOpen={showInfo} onClose={() => setShowInfo(false)} />}
      
      {isMapOpen && (
        <MapViewer 
            feature={selectedEarthquake} 
            allFeatures={filteredData}
            userLocation={userLocation}
            onRequestLocation={handleGeolocation}
            onClose={() => setIsMapOpen(false)}
        />
      )}

    </div>
  );
}

export default App;


import React, { useState, useEffect, useMemo } from 'react';
import { fetchEarthquakes } from './services/ingvService';
import { EarthquakeFeature } from './types';
import EarthquakeCard from './components/EarthquakeCard';
import ChartSection from './components/ChartSection';
import MapViewer from './components/MapViewer';

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

function App() {
  const [data, setData] = useState<EarthquakeFeature[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>('');
  const [showChart, setShowChart] = useState<boolean>(false);
  const [selectedEarthquake, setSelectedEarthquake] = useState<EarthquakeFeature | null>(null);
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  
  // Geolocation states
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(50); // Default 50km
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Initial Fetch & Interval
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const result = await fetchEarthquakes(3); // Last 3 days
      setData(result.features);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeolocation = () => {
    if (userLocation) {
      // Toggle off if already active
      setUserLocation(null);
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Geolocalizzazione non supportata dal browser.");
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
        // Clear text filter when using location to avoid confusion
        setFilterText(''); 
      },
      (error) => {
        console.error("Error getting location:", error);
        setGeoError("Impossibile rilevare la posizione.");
        setIsLocating(false);
      }
    );
  };

  const toggleFilter = (text: string) => {
    if (filterText === text) {
        setFilterText(''); // Deactivate
    } else {
        setFilterText(text); // Activate
        setUserLocation(null); // Disable geo if specific filter is used
    }
  };

  const handleSwipeFilter = (place: string) => {
      if (filterText.toLowerCase() === place.toLowerCase()) {
          setFilterText('');
      } else {
          setFilterText(place);
          setUserLocation(null);
      }
  };

  // Filter Logic
  const filteredData = useMemo(() => {
    let result = data;

    // 1. Text Filter
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter(item => 
        item.properties.place.toLowerCase().includes(lowerFilter)
      );
    }

    // 2. Geolocation Filter
    if (userLocation) {
      result = result.filter(item => {
        const [lng, lat] = item.geometry.coordinates;
        const dist = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
        return dist <= searchRadius;
      });
    }

    // Ensure strict sorting by time descending for correct diff calculation
    return result.sort((a, b) => b.properties.time - a.properties.time);
  }, [data, filterText, userLocation, searchRadius]);

  // Calculate Time Diffs
  const timeDiffMap = useMemo(() => {
    const map = new Map<string, string>();
    for (let i = 0; i < filteredData.length - 1; i++) {
        const current = filteredData[i];
        const prev = filteredData[i + 1]; // The earthquake that happened BEFORE current
        const diffMs = current.properties.time - prev.properties.time;

        const minutes = Math.floor(diffMs / 60000);
        let diffString = "";
        
        if (minutes < 60) {
            diffString = `${minutes} min`;
        } else {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            diffString = `${hours}h ${mins}m`;
        }
        map.set(current.id, diffString);
    }
    return map;
  }, [filteredData]);

  // Grouping Logic
  const groupedData = useMemo(() => {
    const groups: Record<string, EarthquakeFeature[]> = {};

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;

    filteredData.forEach(item => {
      const time = item.properties.time;
      let key: string;

      if (time >= todayStart) {
        key = 'Oggi';
      } else if (time >= yesterdayStart) {
        key = 'Ieri';
      } else {
        const dateObj = new Date(time);
        const dateStr = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
        key = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    return groups;
  }, [filteredData]);

  const sortedGroupKeys = useMemo(() => {
    return Object.keys(groupedData).sort((a, b) => {
      if (a === 'Oggi') return -1;
      if (b === 'Oggi') return 1;
      if (a === 'Ieri') return -1;
      if (b === 'Ieri') return 1;
      
      const timeA = groupedData[a][0]?.properties.time || 0;
      const timeB = groupedData[b][0]?.properties.time || 0;
      return timeB - timeA;
    });
  }, [groupedData]);

  const handleCardClick = (event: EarthquakeFeature) => {
    setSelectedEarthquake(event);
    setIsMapOpen(true);
  };

  // Helper to track the first item for animation
  let isGlobalFirstItem = true;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 text-slate-800 pb-10">
      
      {/* Header & Controls */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-sm border-b border-green-100 transition-all">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <div>
                <h1 className="text-2xl font-black tracking-tight text-emerald-900">TERREMOTI</h1>
                <p className="text-xs text-emerald-600 font-medium">MONITORAGGIO LIVE ITALIA</p>
            </div>
            <button 
              onClick={() => setShowChart(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-95"
              title="Statistiche"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </button>
          </div>

          {/* Search and Location Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-emerald-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                 </div>
                <input 
                    type="text" 
                    placeholder="Cerca città..." 
                    className="w-full pl-10 pr-12 py-3 bg-white border border-green-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-emerald-300/70"
                    value={filterText}
                    onChange={(e) => {
                      setFilterText(e.target.value);
                      setUserLocation(null); // Disable location filter if user types manually
                    }}
                />
                 {filterText && (
                    <button 
                        onClick={() => setFilterText('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-emerald-400 hover:text-emerald-600"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    </button>
                 )}
            </div>
            
            <button 
                onClick={handleGeolocation}
                disabled={isLocating}
                className={`p-3 rounded-xl transition-all border shadow-sm ${userLocation ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-200' : 'bg-white text-emerald-600 border-green-100 hover:bg-green-50'}`}
                title="Usa la mia posizione"
            >
                {isLocating ? (
                   <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={userLocation ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                )}
            </button>
          </div>

          {/* Filters Row */}
          <div className="mt-3 flex gap-2 items-center overflow-x-auto no-scrollbar pb-1">
             {userLocation ? (
                 <div className="flex items-center gap-2 w-full animate-fade-in">
                    <span className="text-xs font-bold text-emerald-800 whitespace-nowrap">Raggio (km):</span>
                    {[5, 10, 20, 50, 100].map(km => (
                        <button
                            key={km}
                            onClick={() => setSearchRadius(km)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${searchRadius === km ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-emerald-600 border-green-200 hover:border-emerald-400'}`}
                        >
                            {km}
                        </button>
                    ))}
                 </div>
             ) : (
                <>
                    <button 
                        onClick={() => toggleFilter('Napoli')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 ${filterText === 'Napoli' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' : 'bg-white text-emerald-700 border-green-100 hover:bg-green-50'}`}
                    >
                         {filterText === 'Napoli' && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        Napoli
                    </button>
                    <button 
                        onClick={() => toggleFilter('Campi Flegrei')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border flex items-center gap-1.5 ${filterText === 'Campi Flegrei' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' : 'bg-white text-emerald-700 border-green-100 hover:bg-green-50'}`}
                    >
                        {filterText === 'Campi Flegrei' && <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                        Campi Flegrei
                    </button>
                </>
             )}
          </div>
          
          {geoError && (
              <div className="mt-2 text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                  {geoError}
              </div>
          )}
        </div>
      </header>

      {/* Main List Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
            <div className="space-y-4 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-20 bg-white rounded-xl border border-green-50"></div>
                ))}
            </div>
        ) : filteredData.length === 0 ? (
            <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4 text-emerald-500">
                    {userLocation ? (
                       <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                    ) : (
                       <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                    )}
                </div>
                <h3 className="text-lg font-bold text-emerald-900">
                    {userLocation ? `Nessun evento entro ${searchRadius}km` : 'Nessun evento trovato'}
                </h3>
                <p className="text-emerald-600/70 text-sm">
                    {userLocation ? 'Prova ad aumentare il raggio di ricerca.' : 'Prova a cambiare i filtri di ricerca.'}
                </p>
                <button onClick={() => { setFilterText(''); setUserLocation(null); }} className="mt-4 text-emerald-600 font-bold text-sm hover:underline">Resetta filtri</button>
            </div>
        ) : (
            <div className="space-y-8">
                {sortedGroupKeys.map(groupKey => {
                    const items = groupedData[groupKey];
                    if (items.length === 0) return null;

                    return (
                        <div key={groupKey}>
                            <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 pl-1 sticky top-[170px] bg-green-50/90 backdrop-blur-sm py-2 z-10">
                                {groupKey}
                            </h2>
                            <div className="space-y-3">
                                {items.map((feature) => {
                                    const isFirst = isGlobalFirstItem;
                                    if (isFirst) isGlobalFirstItem = false;
                                    
                                    return (
                                        <EarthquakeCard 
                                            key={feature.id} 
                                            data={feature} 
                                            onClick={handleCardClick}
                                            onFilter={handleSwipeFilter}
                                            userLocation={userLocation}
                                            activeFilter={filterText}
                                            isFirst={isFirst}
                                            timeSincePrevious={timeDiffMap.get(feature.id)}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </main>

      {/* Floating Action Button for Map */}
      <button 
        onClick={() => { setSelectedEarthquake(null); setIsMapOpen(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-900 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-emerald-950 transition-transform hover:scale-105 active:scale-95 z-40 border-2 border-emerald-400"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>
      </button>

      {/* Modals */}
      {showChart && (
        <ChartSection 
            data={filteredData} 
            title={userLocation ? `Raggio ${searchRadius}km` : (filterText ? `Filtro: ${filterText}` : 'Tutti gli eventi recenti')}
            onClose={() => setShowChart(false)} 
        />
      )}

      {isMapOpen && (
        <MapViewer 
            feature={selectedEarthquake}
            allFeatures={filteredData}
            onClose={() => setIsMapOpen(false)}
        />
      )}

    </div>
  );
}

export default App;

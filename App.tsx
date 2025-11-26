import React, { useState, useEffect, useMemo } from 'react';
import { fetchEarthquakes } from './services/ingvService';
import { EarthquakeFeature, TimeGroup } from './types';
import EarthquakeCard from './components/EarthquakeCard';
import ChartSection from './components/ChartSection';
import MapViewer from './components/MapViewer';

function App() {
  const [data, setData] = useState<EarthquakeFeature[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterText, setFilterText] = useState<string>('');
  const [showChart, setShowChart] = useState<boolean>(false);
  const [selectedEarthquake, setSelectedEarthquake] = useState<EarthquakeFeature | null>(null);
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);

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

  // Filter Logic
  const filteredData = useMemo(() => {
    if (!filterText) return data;
    const lowerFilter = filterText.toLowerCase();
    return data.filter(item => 
      item.properties.place.toLowerCase().includes(lowerFilter)
    );
  }, [data, filterText]);

  // Grouping Logic (Today, Yesterday, Older)
  const groupedData = useMemo(() => {
    const groups: Record<TimeGroup, EarthquakeFeature[]> = {
      'Oggi': [],
      'Ieri': [],
      'Passato': []
    };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;

    filteredData.forEach(item => {
      const time = item.properties.time;
      if (time >= todayStart) {
        groups['Oggi'].push(item);
      } else if (time >= yesterdayStart) {
        groups['Ieri'].push(item);
      } else {
        groups['Passato'].push(item);
      }
    });

    // Sort descending by time within groups
    Object.keys(groups).forEach(key => {
      groups[key as TimeGroup].sort((a, b) => b.properties.time - a.properties.time);
    });

    return groups;
  }, [filteredData]);

  // Handler for opening map with specific event
  const handleCardClick = (event: EarthquakeFeature) => {
    setSelectedEarthquake(event);
    setIsMapOpen(true);
  };

  return (
    <div className="min-h-screen bg-green-50 text-slate-800 pb-10">
      
      {/* 1. Header & Controls */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-sm border-b border-green-100">
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
                    className="w-full pl-10 pr-4 py-3 bg-white border border-green-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all placeholder:text-emerald-300/70"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
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
            
            {/* Quick Filters */}
            <button 
                onClick={() => setFilterText('Napoli')}
                className={`px-3 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${filterText === 'Napoli' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' : 'bg-white text-emerald-700 border-green-100 hover:bg-green-50'}`}
            >
                Nap
            </button>
            <button 
                onClick={() => setFilterText('Campi Flegrei')}
                className={`px-3 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${filterText === 'Campi Flegrei' ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200' : 'bg-white text-emerald-700 border-green-100 hover:bg-green-50'}`}
            >
                Fle
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main List Content */}
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
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
                </div>
                <h3 className="text-lg font-bold text-emerald-900">Nessun evento trovato</h3>
                <p className="text-emerald-600/70 text-sm">Prova a cambiare i filtri di ricerca.</p>
                <button onClick={() => setFilterText('')} className="mt-4 text-emerald-600 font-bold text-sm hover:underline">Resetta filtri</button>
            </div>
        ) : (
            <div className="space-y-8">
                {(['Oggi', 'Ieri', 'Passato'] as TimeGroup[]).map(groupKey => {
                    const items = groupedData[groupKey];
                    if (items.length === 0) return null;

                    return (
                        <div key={groupKey}>
                            <h2 className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-3 pl-1 sticky top-[135px] bg-green-50/90 backdrop-blur-sm py-2 z-10">
                                {groupKey}
                            </h2>
                            <div className="space-y-3">
                                {items.map(feature => (
                                    <EarthquakeCard 
                                        key={feature.id} 
                                        data={feature} 
                                        onClick={handleCardClick}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
      </main>

      {/* Floating Action Button for Map (General) */}
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
            title={filterText ? `Filtro: ${filterText}` : 'Tutti gli eventi recenti'}
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
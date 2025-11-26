import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { EarthquakeFeature } from '../types';

interface MapViewerProps {
  feature: EarthquakeFeature | null; // Single focused event
  allFeatures: EarthquakeFeature[]; // Context events
  onClose: () => void;
}

const MapViewer: React.FC<MapViewerProps> = ({ feature, allFeatures, onClose }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not already done
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current).setView([41.8719, 12.5674], 6);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear existing layers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
        map.removeLayer(layer);
      }
    });

    // Helper for depth color
    const getDepthColor = (d: number) => {
        if (d <= 5) return '#EF4444'; // Red - Molto superficiale (0-5km)
        if (d <= 20) return '#F97316'; // Orange - Superficiale (5-20km)
        if (d <= 50) return '#FACC15'; // Yellow - Intermedio (20-50km)
        return '#10B981'; // Green - Profondo (>50km)
    };

    // Add context markers (all recent events)
    allFeatures.forEach(evt => {
        const [lng, lat, depth] = evt.geometry.coordinates;
        const mag = evt.properties.mag;
        
        const circle = L.circleMarker([lat, lng], {
            radius: Math.max(4, mag * 3), // Magnitude affects size
            fillColor: getDepthColor(depth), // Depth affects color
            color: '#000',
            weight: 0.5,
            opacity: 1,
            fillOpacity: 0.7
        }).addTo(map);

        circle.bindPopup(`
            <div style="font-family: Montserrat; text-align: center; color: #333;">
                <strong style="font-size: 14px;">${evt.properties.place}</strong><br/>
                <div style="margin-top: 4px; font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <span>Mag: <strong>${mag.toFixed(1)}</strong></span>
                    <span style="color: #ccc;">|</span>
                    <span style="display: flex; align-items: center; gap: 3px;">
                        Prof: <strong>${depth.toFixed(1)} km</strong>
                        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: ${getDepthColor(depth)}; border: 1px solid rgba(0,0,0,0.1);"></span>
                    </span>
                </div>
            </div>
        `);
    });

    // Add focused marker if a specific event is selected
    if (feature) {
      const [lng, lat, depth] = feature.geometry.coordinates;
      
      const customIcon = L.icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: Montserrat; text-align: center; color: #333;">
            <strong style="font-size: 14px;">${feature.properties.place}</strong><br/>
            <div style="margin-top: 4px; font-size: 12px; display: flex; flex-direction: column; align-items: center; gap: 2px;">
                <span>Magnitudo: <strong>${feature.properties.mag.toFixed(1)}</strong></span>
                <span style="display: flex; align-items: center; gap: 4px;">
                    Profondità: <strong>${depth.toFixed(1)} km</strong>
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: ${getDepthColor(depth)}; border: 1px solid rgba(0,0,0,0.2);"></span>
                </span>
            </div>
        </div>
      `).openPopup();
      
      map.setView([lat, lng], 12);
    }

    // Cleanup on unmount (optional, but good practice if component destroys)
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

  }, [feature, allFeatures]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden relative">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">
            {feature ? `Epicentro: ${feature.properties.place}` : 'Mappa Eventi'}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>
        <div className="flex-1 relative">
            <div ref={mapContainerRef} className="w-full h-full" />
            
            {/* Legend Overlay */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-slate-200 z-[1000] text-xs pointer-events-none">
                <p className="font-bold mb-2 text-slate-700">Profondità (km)</p>
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500 border border-black/10"></span>
                        <span>&lt; 5 (Molto Sup.)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-orange-500 border border-black/10"></span>
                        <span>5 - 20 (Sup.)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-yellow-400 border border-black/10"></span>
                        <span>20 - 50 (Medio)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 border border-black/10"></span>
                        <span>&gt; 50 (Profondo)</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MapViewer;
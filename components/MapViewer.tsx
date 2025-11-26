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

    // Add context markers (all recent events)
    allFeatures.forEach(evt => {
        const [lng, lat, depth] = evt.geometry.coordinates;
        const mag = evt.properties.mag;
        
        const getColor = (m: number) => {
            if (m < 2) return '#4ADE80'; // Green
            if (m < 3) return '#FACC15'; // Yellow
            if (m < 4) return '#FB923C'; // Orange
            return '#EF4444'; // Red
        };

        const circle = L.circleMarker([lat, lng], {
            radius: Math.max(4, mag * 3),
            fillColor: getColor(mag),
            color: '#000',
            weight: 0.5,
            opacity: 1,
            fillOpacity: 0.6
        }).addTo(map);

        circle.bindPopup(`
            <div style="font-family: Montserrat; text-align: center; color: #333;">
                <strong style="font-size: 14px;">${evt.properties.place}</strong><br/>
                <div style="margin-top: 4px; font-size: 12px;">
                    Mag: <strong>${mag.toFixed(1)}</strong>
                    <span style="margin: 0 4px; color: #ccc;">|</span>
                    Profondità: <strong>${depth.toFixed(1)} km</strong>
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
            <div style="margin-top: 4px; font-size: 12px;">
                Mag: <strong>${feature.properties.mag.toFixed(1)}</strong>
                <span style="margin: 0 4px; color: #ccc;">|</span>
                Profondità: <strong>${depth.toFixed(1)} km</strong>
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
        </div>
      </div>
    </div>
  );
};

export default MapViewer;
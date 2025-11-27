
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { EarthquakeFeature } from '../types';

interface MapViewerProps {
  feature: EarthquakeFeature | null; // Single focused event
  allFeatures: EarthquakeFeature[]; // Context events
  userLocation?: { lat: number; lng: number } | null;
  onRequestLocation: () => void;
  onClose: () => void;
}

const MapViewer: React.FC<MapViewerProps> = ({ feature, allFeatures, userLocation, onRequestLocation, onClose }) => {
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
        
        // Custom divIcon for animated markers
        const markerHtml = `
            <div style="
                width: ${Math.max(10, mag * 6)}px;
                height: ${Math.max(10, mag * 6)}px;
                background-color: ${getDepthColor(depth)};
                border: 1px solid rgba(0,0,0,0.3);
                border-radius: 50%;
                opacity: 0.8;
                box-shadow: 0 0 5px rgba(0,0,0,0.2);
            " class="animate-marker-pop"></div>
        `;

        const icon = L.divIcon({
            html: markerHtml,
            className: '',
            iconSize: [Math.max(10, mag * 6), Math.max(10, mag * 6)],
            iconAnchor: [Math.max(10, mag * 6) / 2, Math.max(10, mag * 6) / 2]
        });

        const marker = L.marker([lat, lng], { icon }).addTo(map);

        // Compact Popup Content
        marker.bindPopup(`
            <div style="font-family: Montserrat; color: #333; min-width: 150px;">
                <strong style="font-size: 13px; display: block; margin-bottom: 4px; border-bottom: 1px solid #eee; padding-bottom: 2px;">${evt.properties.place}</strong>
                <div style="display: flex; gap: 8px; font-size: 12px; margin-top: 4px;">
                    <div style="flex: 1; text-align: center; background: #f8fafc; padding: 2px; rounded: 4px;">
                        <span style="display: block; font-size: 9px; color: #64748b; text-transform: uppercase;">Mag</span>
                        <strong style="font-size: 14px;">${mag.toFixed(1)}</strong>
                    </div>
                    <div style="flex: 1; text-align: center; background: #f8fafc; padding: 2px; rounded: 4px;">
                        <span style="display: block; font-size: 9px; color: #64748b; text-transform: uppercase;">Prof</span>
                        <strong style="font-size: 14px; color: ${getDepthColor(depth)};">${depth.toFixed(0)}km</strong>
                    </div>
                </div>
            </div>
        `, { minWidth: 150, maxWidth: 200, closeButton: false });
    });

    // Add User Location Marker
    if (userLocation) {
        const userIcon = L.divIcon({
            html: `
                <div style="position: relative; width: 20px; height: 20px;">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-color: #2563eb; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 8px rgba(0,0,0,0.4); z-index: 2;"></div>
                    <div style="position: absolute; top: -10px; left: -10px; width: 40px; height: 40px; background-color: rgba(37, 99, 235, 0.3); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                </div>
            `,
            className: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 2000 }).addTo(map)
            .bindPopup('<strong style="font-family: Montserrat; font-size: 12px;">Tu sei qui</strong>');
    }

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

      const marker = L.marker([lat, lng], { icon: customIcon, zIndexOffset: 3000 }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: Montserrat; color: #333; min-width: 150px;">
            <strong style="font-size: 13px; display: block; margin-bottom: 4px; border-bottom: 1px solid #eee; padding-bottom: 2px;">${feature.properties.place}</strong>
            <div style="display: flex; gap: 8px; font-size: 12px; margin-top: 4px;">
                <div style="flex: 1; text-align: center; background: #f8fafc; padding: 2px; rounded: 4px;">
                    <span style="display: block; font-size: 9px; color: #64748b; text-transform: uppercase;">Mag</span>
                    <strong style="font-size: 14px;">${feature.properties.mag.toFixed(1)}</strong>
                </div>
                <div style="flex: 1; text-align: center; background: #f8fafc; padding: 2px; rounded: 4px;">
                    <span style="display: block; font-size: 9px; color: #64748b; text-transform: uppercase;">Prof</span>
                    <strong style="font-size: 14px; color: ${getDepthColor(depth)};">${depth.toFixed(0)}km</strong>
                </div>
            </div>
        </div>
      `, { minWidth: 150, maxWidth: 200, closeButton: false }).openPopup();
      
      map.setView([lat, lng], 12);
    } else if (userLocation && !allFeatures.length) {
        // If only showing map and we have user location but no events loaded yet, center on user
        map.setView([userLocation.lat, userLocation.lng], 10);
    }

    // Cleanup on unmount (optional, but good practice if component destroys)
    setTimeout(() => {
        map.invalidateSize();
    }, 100);

  }, [feature, allFeatures, userLocation]);

  const handleLocateMe = () => {
    if (userLocation && mapInstanceRef.current) {
        mapInstanceRef.current.setView([userLocation.lat, userLocation.lng], 12);
    } else {
        onRequestLocation();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden relative">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">
            {feature ? `Epicentro: ${feature.properties.place}` : 'Mappa Eventi'}
          </h3>
          <div className="flex gap-2">
            <button 
                onClick={handleLocateMe}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-blue-600 bg-blue-50"
                title="La mia posizione"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
            </button>
            <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
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

            {/* Close Button Floating (Z-Index High) */}
             <div className="absolute top-4 right-4 z-[1000]">
                <button 
                    onClick={onClose}
                    className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-100 transition-colors border border-slate-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                </button>
             </div>
        </div>
      </div>
    </div>
  );
};

export default MapViewer;

import React from 'react';

export type NotificationMode = 'global' | 'gps' | 'city';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  minAlertMag: number;
  setMinAlertMag: (val: number) => void;
  
  // New props for dynamic scope
  notifMode: NotificationMode;
  setNotifMode: (mode: NotificationMode) => void;
  notifCity: string;
  setNotifCity: (city: string) => void;
  notifRadius: number;
  setNotifRadius: (km: number) => void;
  userLocation: { lat: number, lng: number } | null;
  onRequestLocation: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  notificationsEnabled,
  setNotificationsEnabled,
  minAlertMag,
  setMinAlertMag,
  notifMode,
  setNotifMode,
  notifCity,
  setNotifCity,
  notifRadius,
  setNotifRadius,
  userLocation,
  onRequestLocation
}) => {
  if (!isOpen) return null;

  const handleToggleNotifications = () => {
    if (!notificationsEnabled) {
      // Request permission
      if (!("Notification" in window)) {
        alert("Questo browser non supporta le notifiche desktop.");
        return;
      }
      Notification.requestPermission().then((permission) => {
        if (permission === "granted") {
          setNotificationsEnabled(true);
          new Notification("Notifiche attivate", {
            body: "Riceverai avvisi per i nuovi terremoti.",
            icon: "/vite.svg"
          });
        } else {
          alert("Permesso notifiche negato.");
          setNotificationsEnabled(false);
        }
      });
    } else {
      setNotificationsEnabled(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden relative animate-slide-up flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-emerald-50 shrink-0">
          <h3 className="font-bold text-lg text-emerald-900">Impostazioni Notifiche</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-emerald-100 rounded-full transition-colors text-emerald-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* Main Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">Abilita Notifiche</p>
              <p className="text-xs text-slate-500">Ricevi avvisi anche se la scheda è in background</p>
            </div>
            <button 
              onClick={handleToggleNotifications}
              className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? 'left-7' : 'left-1'}`}></div>
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Settings Section (Always enabled now) */}
          <div className="space-y-6">
            
            {/* Magnitude Slider */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-800 text-sm">Magnitudo Minima</label>
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md text-xs font-bold">{minAlertMag.toFixed(1)}</span>
                </div>
                <input 
                type="range" 
                min="0" 
                max="5" 
                step="0.1" 
                value={minAlertMag}
                onChange={(e) => setMinAlertMag(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>0.0</span>
                    <span>2.5</span>
                    <span>5.0+</span>
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Scope Selection */}
            <div className="space-y-3">
                <label className="font-bold text-slate-800 text-sm">Area Monitorata</label>
                
                <div className="grid grid-cols-3 gap-2">
                    {/* Global Button */}
                    <button 
                        onClick={() => setNotifMode('global')}
                        className={`py-3 px-1 rounded-lg text-xs font-bold border flex flex-col items-center gap-2 transition-all ${notifMode === 'global' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-200'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                        Tutta Italia
                    </button>
                    
                    {/* GPS Button */}
                    <button 
                        onClick={() => setNotifMode('gps')}
                        className={`py-3 px-1 rounded-lg text-xs font-bold border flex flex-col items-center gap-2 transition-all ${notifMode === 'gps' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-200'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                        GPS
                    </button>

                    {/* City Button */}
                    <button 
                        onClick={() => setNotifMode('city')}
                        className={`py-3 px-1 rounded-lg text-xs font-bold border flex flex-col items-center gap-2 transition-all ${notifMode === 'city' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-200'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4 8 4v14"/><path d="M17 21v-8H7v8"/><line x1="17" x2="17" y1="9" y2="9"/><line x1="7" x2="7" y1="9" y2="9"/><line x1="17" x2="17" y1="13" y2="13"/><line x1="7" x2="7" y1="13" y2="13"/></svg>
                        Città
                    </button>
                </div>

                {/* GPS Configuration */}
                {notifMode === 'gps' && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3 animate-fade-in">
                        {!userLocation ? (
                             <button 
                                onClick={onRequestLocation}
                                className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                                Attiva Posizione
                             </button>
                        ) : (
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <label className="text-xs font-bold text-slate-700">Raggio notifica</label>
                                    <span className="text-xs font-bold text-emerald-600">{notifRadius} km</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="10" 
                                    max="100" 
                                    step="5" 
                                    value={notifRadius}
                                    onChange={(e) => setNotifRadius(parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                                />
                                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    Posizione acquisita
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* City Configuration */}
                {notifMode === 'city' && (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-2 animate-fade-in">
                        <label className="text-xs font-bold text-slate-700">Nome Città o Zone</label>
                        <input 
                            type="text" 
                            placeholder="Es. Napoli, Campi Flegrei, Vesuvio" 
                            value={notifCity}
                            onChange={(e) => setNotifCity(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
                        />
                        <p className="text-[10px] text-slate-400">Separa i luoghi con una virgola per monitorare più zone.</p>
                    </div>
                )}

            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-900 transition-colors"
            >
                Chiudi
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
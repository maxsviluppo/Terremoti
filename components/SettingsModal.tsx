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
  isLocating?: boolean;
  geoError?: string | null;

  // Audio Props
  alarmVolume: number;
  setAlarmVolume: (vol: number) => void;
  onTestSound: () => void;
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
  onRequestLocation,
  isLocating = false,
  geoError = null,
  alarmVolume,
  setAlarmVolume,
  onTestSound
}) => {
  if (!isOpen) return null;

  const handleToggleNotifications = async () => {
    // Caso 1: Stiamo disattivando
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      return;
    }

    // Initialize audio via test when enabling
    onTestSound();

    // Caso 2: Stiamo attivando
    if (!("Notification" in window)) {
      alert("Questo browser non supporta le notifiche desktop.");
      setNotificationsEnabled(true); // Enable internal alert anyway
      return;
    }

    // Verifica lo stato corrente dei permessi
    if (Notification.permission === "granted") {
      setNotificationsEnabled(true);
      return;
    }

    if (Notification.permission === "denied") {
      alert("Le notifiche push sono state bloccate. Riceverai comunque l'avviso visivo rosso nell'app.");
      setNotificationsEnabled(true); // Enable internal alert
      return;
    }

    // Se siamo qui, permission è 'default', quindi chiediamo
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        try {
          new Notification("Notifiche attivate", {
            body: "Riceverai avvisi per i nuovi terremoti.",
            icon: "vite.svg" // Fixed relative path
          });
        } catch (e) {
          console.log("Notifica test non inviata (normale su mobile senza SW):", e);
        }
      } else {
        setNotificationsEnabled(true);
        alert("Notifiche push negate, ma riceverai l'avviso visivo nell'app.");
      }
    } catch (error) {
      console.error("Errore nella richiesta permessi:", error);
      setNotificationsEnabled(true);
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
              <p className="text-xs text-slate-500">Ricevi avvisi e suoni (Push + Banner)</p>
            </div>
            <button 
              onClick={handleToggleNotifications}
              className={`w-14 h-7 rounded-full transition-all relative outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400 ${
                  notificationsEnabled 
                  ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]' 
                  : 'bg-slate-300'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all shadow-sm flex items-center justify-center ${
                  notificationsEnabled 
                  ? 'left-8 scale-110' 
                  : 'left-1'
              }`}>
                  {notificationsEnabled && (
                      <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-20"></span>
                  )}
              </span>
            </button>
          </div>

          <hr className="border-slate-100" />

          {/* Volume Settings */}
          <div className="space-y-3">
             <div className="flex justify-between items-center">
                 <label className="font-bold text-slate-800 text-sm">Volume Allarme</label>
                 <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md text-xs font-bold">{(alarmVolume * 100).toFixed(0)}%</span>
             </div>
             <div className="flex items-center gap-3">
                 <button onClick={onTestSound} className="p-2 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200" title="Prova Suono">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                 </button>
                 <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.1" 
                    value={alarmVolume}
                    onChange={(e) => setAlarmVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                 />
             </div>
             <p className="text-[10px] text-slate-400">Clicca l'icona play per testare e sbloccare l'audio.</p>
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
                                disabled={isLocating}
                                className={`w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${isLocating ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                             >
                                {isLocating ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Rilevamento...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                                        Attiva Posizione
                                    </>
                                )}
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
                        {geoError && (
                            <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{geoError}</p>
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

import React from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden relative animate-slide-up flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800">Informazioni</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </div>
          
          {/* Disclaimer Box */}
          <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-xs text-orange-800 text-left leading-relaxed shadow-sm">
            <p className="mb-2">
                <strong>Nota:</strong> Le notifiche degli eventi sismici vengono visualizzate dopo qualche minuto in base agli aggiornamenti di INGV (Fonte dati).
            </p>
            <p>
                L'App funziona meglio se si aggiunge alla Home mediante il comando di condivisione link.
            </p>
          </div>

          <div className="pt-2">
            <h4 className="text-xl font-bold text-slate-800">DevTools</h4>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">by Castro Massimo</p>
          </div>
          
          <p className="text-slate-600 leading-relaxed text-sm">
            Questa App è realizzata da DevTools by Castro Massimo. 
            <br/>Se hai bisogno di supporto, segnalazioni o di WebApp personalizzate contattaci.
          </p>

          <a 
            href="mailto:castromassimo@gmail.com?subject=Richiesta%20Info%20WebApp"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-transform active:scale-95 shadow-lg shadow-emerald-200 mt-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            Contattaci via Email
          </a>
        </div>
      </div>
    </div>
  );
};

export default InfoModal;

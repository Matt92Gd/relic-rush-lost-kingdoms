import React from 'react';
import { Home, Play, RotateCcw, Settings } from 'lucide-react';

interface PauseModalProps {
  distance: number;
  score: number;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onMenu: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  distance,
  score,
  onResume,
  onRestart,
  onOpenSettings,
  onMenu,
}) => {
  return (
    <div className="modal-backdrop">
      <div className="glass-panel modal-shell" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <h2 className="font-display" style={{ margin: 0, color: '#fde047' }}>
            GIOCO IN PAUSA
          </h2>
        </div>
        <div className="modal-body" style={{ textAlign: 'center' }}>
          <div className="glass-card" style={{ padding: 12, display: 'flex', justifyContent: 'space-around' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Distanza</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>{Math.floor(distance)} m</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Punteggio</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fde047' }}>
                {Math.floor(score).toLocaleString('it-IT')}
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={onResume} style={{ padding: '12px' }}>
            <Play size={18} />
            <span>Riprendi Corsa</span>
          </button>
          <button className="btn" onClick={onRestart} style={{ padding: '12px' }}>
            <RotateCcw size={18} />
            <span>Ricomincia</span>
          </button>
          <button className="btn" onClick={onOpenSettings} style={{ padding: '12px' }}>
            <Settings size={18} />
            <span>Impostazioni</span>
          </button>
          <button className="btn btn-danger" onClick={onMenu} style={{ padding: '12px' }}>
            <Home size={18} />
            <span>Torna al Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};

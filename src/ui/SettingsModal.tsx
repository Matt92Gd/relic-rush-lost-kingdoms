import React, { useState } from 'react';
import { Download, RotateCcw, Trash2, Upload, Volume2, VolumeX, X } from 'lucide-react';
import type { GameSettings, QualityPreset, SaveData } from '../types/game.types';

interface SettingsModalProps {
  save: SaveData;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onExportSave: () => string;
  onImportSave: (json: string) => boolean;
  onResetSave: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  save,
  onClose,
  onUpdateSettings,
  onExportSave,
  onImportSave,
  onResetSave,
}) => {
  const s = save.settings;
  const [importText, setImportText] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleDownload = () => {
    const json = onExportSave();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relic-rush-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMsg('Salvataggio esportato!');
  };

  const handleImport = () => {
    if (!importText.trim()) return;
    const ok = onImportSave(importText);
    setStatusMsg(ok ? 'Salvataggio importato con successo!' : 'JSON non valido o corrotto.');
    if (ok) setImportText('');
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-panel modal-shell" style={{ maxWidth: 680 }}>
        <div className="modal-header">
          <h2 className="font-display" style={{ margin: 0, color: '#fde047' }}>
            IMPOSTAZIONI & DATI
          </h2>
          <button className="btn" aria-label="Chiudi" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Audio */}
          <div className="glass-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800 }}>Audio & Effetti</span>
              <button
                className={`btn ${s.muted ? 'btn-danger' : ''}`}
                style={{ padding: '6px 12px' }}
                onClick={() => onUpdateSettings({ muted: !s.muted })}
              >
                {s.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <span>{s.muted ? 'Audio Disattivato' : 'Audio Attivo'}</span>
              </button>
            </div>

            {(
              [
                ['masterVolume', 'Volume Generale'],
                ['musicVolume', 'Volume Musica'],
                ['sfxVolume', 'Volume Effetti (SFX)'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: '0.84rem' }}>
                <span>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={s[key]}
                    onChange={(e) => onUpdateSettings({ [key]: Number(e.target.value) })}
                  />
                  <span style={{ width: 38, textAlign: 'right' }}>{Math.round(s[key] * 100)}%</span>
                </div>
              </label>
            ))}
          </div>

          {/* Grafica */}
          <div className="glass-card" style={{ padding: 14 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Qualità Grafica 3D</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(
                [
                  ['low', 'Basso'],
                  ['medium', 'Medio'],
                  ['high', 'Alto'],
                  ['ultra', 'Ultra'],
                ] as Array<[QualityPreset, string]>
              ).map(([preset, label]) => (
                <button
                  key={preset}
                  className={`btn ${s.qualityPreset === preset ? 'btn-primary' : ''}`}
                  onClick={() => onUpdateSettings({ qualityPreset: preset })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Controlli & Debug */}
          <div className="glass-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Controlli & Opzioni</div>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', cursor: 'pointer' }}>
              <span>Controlli con Inclinazione Smartphone (Giroscopio)</span>
              <input
                type="checkbox"
                checked={s.tiltControlsEnabled}
                onChange={(e) => onUpdateSettings({ tiltControlsEnabled: e.target.checked })}
              />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem', cursor: 'pointer' }}>
              <span>Mostra Pannello Debug Prestazioni (FPS / Segmenti)</span>
              <input
                type="checkbox"
                checked={s.showDebugPanel}
                onChange={(e) => onUpdateSettings({ showDebugPanel: e.target.checked })}
              />
            </label>
            <button
              className="btn"
              onClick={() => {
                onUpdateSettings({ tutorialCompleted: false });
                setStatusMsg('Il tutorial interattivo verrà mostrato nella prossima partita.');
              }}
            >
              <RotateCcw size={16} />
              <span>Ripeti Tutorial Interattivo alla Prossima Partita</span>
            </button>
          </div>

          {/* Salvataggi */}
          <div className="glass-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontWeight: 800 }}>Gestione Salvataggi Locali</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn" onClick={handleDownload}>
                <Download size={16} />
                <span>Esporta JSON</span>
              </button>
              {!confirmReset ? (
                <button className="btn btn-danger" onClick={() => setConfirmReset(true)}>
                  <Trash2 size={16} />
                  <span>Azzera Progressi</span>
                </button>
              ) : (
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    onResetSave();
                    setConfirmReset(false);
                    setStatusMsg('Salvataggio resettato.');
                  }}
                >
                  Conferma Reset Definitivo?
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Incolla qui un salvataggio JSON esportato..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                style={{
                  flex: 1,
                  background: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.18)',
                  color: '#f8fafc',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: '0.8rem',
                }}
              />
              <button className="btn btn-primary" onClick={handleImport}>
                <Upload size={16} />
                <span>Importa</span>
              </button>
            </div>

            {statusMsg && (
              <div style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 700 }}>
                {statusMsg}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

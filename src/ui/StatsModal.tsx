import React from 'react';
import { BarChart3, Calendar, Trophy, X } from 'lucide-react';
import { BIOMES, BIOME_ORDER, GAME_MODES } from '../data/gameCatalog';
import { SeededRandom } from '../core/SeededRandom';
import type { SaveData } from '../types/game.types';

interface StatsModalProps {
  save: SaveData;
  onClose: () => void;
}

export const StatsModal: React.FC<StatsModalProps> = ({ save, onClose }) => {
  const dailySeed = SeededRandom.getDailySeed();
  const dailyBoard = save.dailyLeaderboard[dailySeed] ?? [];

  return (
    <div className="modal-backdrop">
      <div className="glass-panel modal-shell">
        <div className="modal-header">
          <div>
            <h2 className="font-display" style={{ margin: 0, color: '#fde047' }}>
              STATISTICHE & RECORD LOCALI
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Riepilogo personale della carriera salvato localmente sul tuo dispositivo.
            </div>
          </div>
          <button className="btn" aria-label="Chiudi" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="grid-cards">
            {[
              ['Partite Totali', save.stats.totalRuns],
              ['Record Punteggio', save.stats.bestScore.toLocaleString('it-IT')],
              ['Record Distanza', `${save.stats.bestDistance.toLocaleString('it-IT')} m`],
              ['Distanza Totale', `${save.stats.totalDistance.toLocaleString('it-IT')} m`],
              ['Monete Raccolte', save.stats.totalCoinsCollected.toLocaleString('it-IT')],
              ['Ostacoli Evitati', save.stats.totalObstaclesDodged.toLocaleString('it-IT')],
              ['Salti / Scivolate', `${save.stats.totalJumps} / ${save.stats.totalSlides}`],
              ['Eventi Superati', save.stats.totalEventsSurvived],
            ].map(([label, val]) => (
              <div key={String(label)} className="glass-card" style={{ padding: 12 }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{label}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', marginTop: 2 }}>
                  {val}
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart3 size={16} color="#34d399" /> Esplorazione per Regno
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {BIOME_ORDER.map((b) => {
                const dist = save.stats.biomeDistance[b] ?? 0;
                const maxDist = Math.max(100, ...Object.values(save.stats.biomeDistance));
                return (
                  <div key={b}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 3 }}>
                      <span style={{ color: BIOMES[b].accentHex, fontWeight: 700 }}>{BIOMES[b].name}</span>
                      <span>{dist.toLocaleString('it-IT')} m</span>
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${Math.min(100, Math.round((dist / maxDist) * 100))}%`,
                          background: BIOMES[b].accentHex,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trophy size={16} color="#eab308" /> Migliori Punteggi Locali per Modalità
            </div>
            <div className="grid-cards">
              {GAME_MODES.map((m) => {
                const rec = save.stats.bestByMode[m.id];
                return (
                  <div key={m.id} style={{ fontSize: '0.8rem', padding: '6px 8px', background: 'rgba(15,23,42,0.55)', borderRadius: 8 }}>
                    <div style={{ fontWeight: 700, color: m.badgeColor }}>{m.name}</div>
                    <div>Punti: {rec?.score.toLocaleString('it-IT') ?? 0}</div>
                    <div>Distanza: {rec?.distance.toLocaleString('it-IT') ?? 0} m</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card" style={{ padding: 14 }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={16} color="#38bdf8" /> Classifica Locale Percorso Giornaliero ({dailySeed})
            </div>
            {dailyBoard.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Nessun tentativo registrato oggi sul tuo dispositivo.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dailyBoard.map((entry, idx) => (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                      padding: '6px 10px',
                      background: 'rgba(15,23,42,0.6)',
                      borderRadius: 8,
                    }}
                  >
                    <span>
                      #{idx + 1} • {entry.characterId.toUpperCase()}
                    </span>
                    <span>
                      <strong>{entry.score.toLocaleString('it-IT')}</strong> pt ({entry.distance} m)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

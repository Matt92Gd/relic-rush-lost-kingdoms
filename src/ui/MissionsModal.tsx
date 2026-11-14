import React, { useState } from 'react';
import { CheckCircle2, Coins, Gem, X } from 'lucide-react';
import { BIOMES } from '../data/gameCatalog';
import type { MissionProgress, SaveData } from '../types/game.types';

interface MissionsModalProps {
  save: SaveData;
  onClose: () => void;
  onClaimMission: (missionId: string) => void;
}

type MissionTab = 'daily' | 'weekly' | 'permanent' | 'realm';

export const MissionsModal: React.FC<MissionsModalProps> = ({
  save,
  onClose,
  onClaimMission,
}) => {
  const [tab, setTab] = useState<MissionTab>('daily');
  const filtered: MissionProgress[] = save.missions.filter((m) => m.category === tab);

  return (
    <div className="modal-backdrop">
      <div className="glass-panel modal-shell">
        <div className="modal-header">
          <div>
            <h2 className="font-display" style={{ margin: 0, color: '#fde047' }}>
              MISSIONI & SFIDE DEI REGNI
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Completa incarichi per ottenere Monete, Cristalli e sbloccare nuovi Regni.
            </div>
          </div>
          <button className="btn" aria-label="Chiudi" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(
              [
                ['daily', 'Giornaliere'],
                ['weekly', 'Settimanali'],
                ['permanent', 'Permanenti'],
                ['realm', 'Sfide dei Regni (15)'],
              ] as const
            ).map(([id, label]) => {
              const ready = save.missions.filter(
                (m) => m.category === id && m.completed && !m.claimed
              ).length;
              return (
                <button
                  key={id}
                  className={`btn ${tab === id ? 'btn-primary' : ''}`}
                  onClick={() => setTab(id)}
                >
                  <span>{label}</span>
                  {ready > 0 && (
                    <span
                      style={{
                        background: '#ef4444',
                        color: '#fff',
                        borderRadius: 999,
                        padding: '1px 6px',
                        fontSize: '0.7rem',
                      }}
                    >
                      {ready}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((m) => {
              const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
              return (
                <div
                  key={m.id}
                  className="glass-card"
                  style={{
                    padding: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.94rem' }}>{m.title}</span>
                      {m.biome && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: BIOMES[m.biome].accentHex,
                            border: `1px solid ${BIOMES[m.biome].accentHex}`,
                            padding: '1px 6px',
                            borderRadius: 999,
                          }}
                        >
                          {BIOMES[m.biome].name}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: 2 }}>
                      {m.description}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      <div className="progress-track" style={{ flex: 1 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${pct}%`,
                            background: m.completed ? '#34d399' : '#38bdf8',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, minWidth: 72, textAlign: 'right' }}>
                        {m.progress} / {m.target}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: '0.78rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <Coins size={13} color="#eab308" /> +{m.rewardCoins}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 4 }}>
                        <Gem size={13} color="#38bdf8" /> +{m.rewardCrystals}
                      </div>
                    </div>

                    {m.claimed ? (
                      <span style={{ color: '#34d399', fontSize: '0.8rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={16} /> Riscossa
                      </span>
                    ) : m.completed ? (
                      <button className="btn btn-emerald" onClick={() => onClaimMission(m.id)}>
                        Riscuoti
                      </button>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '0.78rem', fontWeight: 700 }}>
                        In corso
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

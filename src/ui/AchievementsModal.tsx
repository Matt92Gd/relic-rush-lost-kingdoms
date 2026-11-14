import React, { useState } from 'react';
import { Award, CheckCircle2, Gem, Lock, X } from 'lucide-react';
import { ACHIEVEMENTS } from '../data/gameCatalog';
import type { AchievementDefinition, SaveData } from '../types/game.types';

interface AchievementsModalProps {
  save: SaveData;
  onClose: () => void;
}

const CATEGORIES: Array<{ id: 'all' | AchievementDefinition['category']; label: string }> = [
  { id: 'all', label: 'Tutti' },
  { id: 'distance', label: 'Distanza' },
  { id: 'score', label: 'Punteggio' },
  { id: 'coins', label: 'Monete' },
  { id: 'skill', label: 'Abilità' },
  { id: 'progression', label: 'Progressione' },
  { id: 'exploration', label: 'Esplorazione' },
  { id: 'special', label: 'Sfide Speciali' },
];

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ save, onClose }) => {
  const [cat, setCat] = useState<'all' | AchievementDefinition['category']>('all');
  const list =
    cat === 'all' ? ACHIEVEMENTS : ACHIEVEMENTS.filter((a) => a.category === cat);

  return (
    <div className="modal-backdrop">
      <div className="glass-panel modal-shell">
        <div className="modal-header">
          <div>
            <h2 className="font-display" style={{ margin: 0, color: '#fde047' }}>
              ACHIEVEMENT ({save.unlockedAchievements.length} / {ACHIEVEMENTS.length})
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Ogni traguardo sbloccato assegna automaticamente Cristalli d’Etere.
            </div>
          </div>
          <button className="btn" aria-label="Chiudi" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                className={`btn ${cat === c.id ? 'btn-primary' : ''}`}
                style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                onClick={() => setCat(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="grid-cards">
            {list.map((ach) => {
              const unlocked = save.unlockedAchievements.includes(ach.id);
              return (
                <div
                  key={ach.id}
                  className="glass-card"
                  style={{
                    padding: 12,
                    borderColor: unlocked ? '#c084fc' : undefined,
                    opacity: unlocked ? 1 : 0.72,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {unlocked ? <Award size={16} color="#c084fc" /> : <Lock size={14} color="#64748b" />}
                        {ach.title}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <Gem size={12} /> +{ach.rewardCrystals}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.76rem', color: '#cbd5e1', margin: '6px 0 0' }}>
                      {ach.description}
                    </p>
                  </div>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: unlocked ? '#34d399' : '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {unlocked ? (
                      <>
                        <CheckCircle2 size={14} /> Sbloccato
                      </>
                    ) : (
                      'Bloccato'
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

import React from 'react';
import { CheckCircle2, Crown, Lock, Sparkles, X } from 'lucide-react';
import { BIOMES, BIOME_ORDER, RELICS } from '../data/gameCatalog';
import type { SaveData } from '../types/game.types';

interface CollectionModalProps {
  save: SaveData;
  onClose: () => void;
}

export const CollectionModal: React.FC<CollectionModalProps> = ({ save, onClose }) => {
  return (
    <div className="modal-backdrop">
      <div className="glass-panel modal-shell">
        <div className="modal-header">
          <div>
            <h2 className="font-display" style={{ margin: 0, color: '#fde047' }}>
              COLLEZIONE RELIQUIE & REGNI
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Raccogli i 3 frammenti di ogni Regno durante le partite per attivare bonus passivi permanenti.
            </div>
          </div>
          <button className="btn" aria-label="Chiudi" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#cbd5e1' }}>
            RELIQUIE ANTICHE
          </div>
          <div className="grid-cards">
            {RELICS.map((rel) => {
              const prog = save.relicProgress[rel.id] ?? [false, false, false];
              const count = prog.filter(Boolean).length;
              const complete = count === 3;
              return (
                <div
                  key={rel.id}
                  className="glass-card"
                  style={{
                    padding: 14,
                    borderColor: complete ? rel.accentColor : undefined,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: rel.accentColor, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Crown size={16} /> {rel.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{count}/3</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Regno: {BIOMES[rel.biome].name}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: 0 }}>{rel.lore}</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                    {rel.fragmentNames.map((fName, idx) => (
                      <div
                        key={fName}
                        style={{
                          fontSize: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          color: prog[idx] ? '#34d399' : '#64748b',
                        }}
                      >
                        {prog[idx] ? <CheckCircle2 size={13} /> : <Lock size={13} />}
                        <span>{fName}</span>
                      </div>
                    ))}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      padding: '6px 8px',
                      borderRadius: 8,
                      background: complete ? 'rgba(52, 211, 153, 0.14)' : 'rgba(255,255,255,0.04)',
                      color: complete ? '#34d399' : '#94a3b8',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    <Sparkles size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                    {rel.bonusDescription} {complete ? '(ATTIVO)' : '(Da completare)'}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#cbd5e1', marginTop: 8 }}>
            ATLANTE DEI CINQUE REGNI
          </div>
          <div className="grid-cards">
            {BIOME_ORDER.map((bId) => {
              const b = BIOMES[bId];
              const unlocked = save.unlockedBiomes.includes(bId);
              const dist = Math.floor(save.stats.biomeDistance[bId] ?? 0);
              return (
                <div
                  key={bId}
                  className="glass-card"
                  style={{ padding: 12, borderColor: unlocked ? b.accentHex : undefined }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: b.accentHex }}>{b.name}</span>
                    {!unlocked && <Lock size={14} color="#64748b" />}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>{b.subtitle}</div>
                  <p style={{ fontSize: '0.76rem', color: '#cbd5e1', margin: '6px 0' }}>{b.description}</p>
                  <div style={{ fontSize: '0.74rem', fontWeight: 700, color: unlocked ? '#34d399' : '#fbbf24' }}>
                    {unlocked
                      ? `Distanza esplorata: ${dist.toLocaleString('it-IT')} m`
                      : `Sblocco: Livello ${b.unlockLevel} o Sfida del Regno`}
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

import React from 'react';
import { ArrowUpCircle, Coins, X } from 'lucide-react';
import { UPGRADES, getUpgradeCost } from '../data/gameCatalog';
import type { SaveData, UpgradeId } from '../types/game.types';

interface ShopUpgradesModalProps {
  save: SaveData;
  onClose: () => void;
  onBuyUpgrade: (id: UpgradeId) => void;
}

export const ShopUpgradesModal: React.FC<ShopUpgradesModalProps> = ({
  save,
  onClose,
  onBuyUpgrade,
}) => {
  return (
    <div className="modal-backdrop">
      <div className="glass-panel modal-shell">
        <div className="modal-header">
          <div>
            <h2 className="font-display" style={{ margin: 0, color: '#fde047' }}>
              POTENZIAMENTI PERMANENTI
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Investi le tue monete per migliorare in modo permanente ogni spedizione futura.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="currency-pill">
              <Coins size={16} color="#eab308" /> {save.coins.toLocaleString('it-IT')}
            </span>
            <button className="btn" aria-label="Chiudi" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          <div className="grid-cards">
            {UPGRADES.map((up) => {
              const level = save.upgrades[up.id] ?? 0;
              const isMax = level >= up.maxLevel;
              const cost = isMax ? 0 : getUpgradeCost(up, level);
              const affordable = !isMax && save.coins >= cost;

              return (
                <div
                  key={up.id}
                  className="glass-card"
                  style={{
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.96rem' }}>{up.name}</span>
                      <span style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: 700 }}>
                        Liv. {level} / {up.maxLevel}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '6px 0' }}>
                      {up.description}
                    </p>
                    <div style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: 600 }}>
                      Effetto: {up.effectPerLevelLabel}
                    </div>

                    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                      {Array.from({ length: up.maxLevel }, (_, idx) => (
                        <div
                          key={idx}
                          style={{
                            flex: 1,
                            height: 6,
                            borderRadius: 4,
                            background: idx < level ? '#eab308' : 'rgba(255,255,255,0.12)',
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    disabled={isMax || !affordable}
                    className={`btn ${isMax ? 'btn-emerald' : 'btn-primary'}`}
                    onClick={() => onBuyUpgrade(up.id)}
                  >
                    <ArrowUpCircle size={16} />
                    <span>{isMax ? 'LIVELLO MASSIMO' : `Migliora (${cost} Monete)`}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

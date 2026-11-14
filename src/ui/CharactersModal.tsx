import React from 'react';
import { Check, Coins, Gem, Palette, Sparkles, X } from 'lucide-react';
import { ACCESSORIES, CHARACTERS, TRAILS } from '../data/gameCatalog';
import type {
  AccessoryId,
  CelebrationStyle,
  CharacterId,
  SaveData,
  TrailId,
} from '../types/game.types';

interface CharactersModalProps {
  save: SaveData;
  onClose: () => void;
  onSelectOrUnlockCharacter: (id: CharacterId) => void;
  onSetColor: (id: CharacterId, hex: string) => void;
  onSelectOrUnlockAccessory: (id: AccessoryId) => void;
  onSelectOrUnlockTrail: (id: TrailId) => void;
  onSetCelebration: (style: CelebrationStyle) => void;
}

const COLOR_SWATCHES = ['#2c5f8a', '#1f7a63', '#9f2a1d', '#6d28d9', '#d97706', '#0f766e', '#e11d48'];

export const CharactersModal: React.FC<CharactersModalProps> = ({
  save,
  onClose,
  onSelectOrUnlockCharacter,
  onSetColor,
  onSelectOrUnlockAccessory,
  onSelectOrUnlockTrail,
  onSetCelebration,
}) => {
  const selectedChar = CHARACTERS.find((c) => c.id === save.selectedCharacter) ?? CHARACTERS[0];
  const currentColor = save.characterCustomColors[selectedChar.id] ?? selectedChar.baseColor;

  return (
    <div className="modal-backdrop">
      <div className="glass-panel modal-shell">
        <div className="modal-header">
          <div>
            <h2 className="font-display" style={{ margin: 0, color: '#fde047' }}>
              ESPLORATORI & PERSONALIZZAZIONE
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
              Sblocca nuovi eroi e personalizza abito, accessori, scie e pose celebrative.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="currency-pill">
              <Coins size={15} color="#eab308" /> {save.coins}
            </span>
            <span className="currency-pill">
              <Gem size={15} color="#38bdf8" /> {save.crystals}
            </span>
            <button className="btn" aria-label="Chiudi" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Personaggi */}
          <div className="grid-cards">
            {CHARACTERS.map((char) => {
              const unlocked = save.unlockedCharacters.includes(char.id);
              const selected = save.selectedCharacter === char.id;
              const canBuy =
                unlocked ||
                (char.unlockType === 'coins' && save.coins >= char.unlockCost) ||
                (char.unlockType === 'crystals' && save.crystals >= char.unlockCost) ||
                (char.unlockType === 'level' && save.level >= char.unlockCost);

              return (
                <div
                  key={char.id}
                  className="glass-card"
                  style={{
                    padding: 14,
                    borderColor: selected ? '#fde047' : undefined,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: save.characterCustomColors[char.id] ?? char.baseColor,
                          border: `2px solid ${char.secondaryColor}`,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem' }}>{char.name}</div>
                        <div style={{ fontSize: '0.75rem', color: char.accentColor }}>{char.title}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#cbd5e1', margin: '8px 0 0' }}>
                      {char.lore}
                    </p>
                  </div>

                  <button
                    disabled={!unlocked && !canBuy}
                    className={`btn ${selected ? 'btn-emerald' : unlocked ? '' : 'btn-primary'}`}
                    onClick={() => onSelectOrUnlockCharacter(char.id)}
                  >
                    {selected ? (
                      <>
                        <Check size={15} /> Selezionato
                      </>
                    ) : unlocked ? (
                      'Seleziona'
                    ) : (
                      `Sblocca (${char.unlockRequirementLabel})`
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Colore Abito & Posa Celebrativa */}
          <div className="glass-card" style={{ padding: 14, display: 'flex', flexWrap: 'wrap', gap: 18, justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Palette size={15} color="#eab308" /> Colore Abito ({selectedChar.name})
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {COLOR_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    aria-label={`Colore ${hex}`}
                    onClick={() => onSetColor(selectedChar.id, hex)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: hex,
                      border: currentColor === hex ? '3px solid #fde047' : '2px solid rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Sparkles size={15} color="#34d399" /> Posa Celebrativa
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(
                  [
                    ['victory_fist', 'Pugno Vittoria'],
                    ['spin_leap', 'Salto Rotante'],
                    ['rune_salute', 'Saluto Runico'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    className={`btn ${save.selectedCelebration === id ? 'btn-primary' : ''}`}
                    style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                    onClick={() => onSetCelebration(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Accessori */}
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#cbd5e1', marginBottom: 8 }}>
              ACCESSORI
            </div>
            <div className="grid-cards">
              {ACCESSORIES.map((acc) => {
                const unlocked = save.unlockedAccessories.includes(acc.id);
                const selected = save.selectedAccessory === acc.id;
                return (
                  <div key={acc.id} className="glass-card" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem' }}>{acc.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{acc.description}</div>
                    </div>
                    <button
                      disabled={!unlocked && save.crystals < acc.costCrystals}
                      className={`btn ${selected ? 'btn-emerald' : unlocked ? '' : 'btn-primary'}`}
                      style={{ padding: '6px 10px', fontSize: '0.76rem' }}
                      onClick={() => onSelectOrUnlockAccessory(acc.id)}
                    >
                      {selected ? 'Attivo' : unlocked ? 'Indossa' : `${acc.costCrystals} Crist.`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scie */}
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#cbd5e1', marginBottom: 8 }}>
              EFFETTI SCIA
            </div>
            <div className="grid-cards">
              {TRAILS.map((tr) => {
                const unlocked = save.unlockedTrails.includes(tr.id);
                const selected = save.selectedTrail === tr.id;
                return (
                  <div key={tr.id} className="glass-card" style={{ padding: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.86rem', color: tr.colorHex }}>{tr.name}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{tr.description}</div>
                    </div>
                    <button
                      disabled={!unlocked && save.coins < tr.costCoins}
                      className={`btn ${selected ? 'btn-emerald' : unlocked ? '' : 'btn-primary'}`}
                      style={{ padding: '6px 10px', fontSize: '0.76rem' }}
                      onClick={() => onSelectOrUnlockTrail(tr.id)}
                    >
                      {selected ? 'Attiva' : unlocked ? 'Equipaggia' : `${tr.costCoins} Mon.`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

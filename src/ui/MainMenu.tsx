import React from 'react';
import {
  Award,
  BarChart3,
  Coins,
  Compass,
  Crown,
  Gem,
  Gift,
  Lock,
  Play,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  User,
  Zap,
} from 'lucide-react';
import { BIOMES, BIOME_ORDER, GAME_MODES, getXpRequiredForLevel } from '../data/gameCatalog';
import type { BiomeId, GameModeId, SaveData } from '../types/game.types';

export type MenuModalId =
  | null
  | 'characters'
  | 'upgrades'
  | 'missions'
  | 'achievements'
  | 'collection'
  | 'stats'
  | 'settings';

interface MainMenuProps {
  save: SaveData;
  canClaimDaily: boolean;
  onPlay: () => void;
  onSelectMode: (mode: GameModeId) => void;
  onSelectBiome: (biome: BiomeId | 'rotating') => void;
  onClaimDaily: () => void;
  onOpenModal: (modal: MenuModalId) => void;
  onDismissInterrupted: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  save,
  canClaimDaily,
  onPlay,
  onSelectMode,
  onSelectBiome,
  onClaimDaily,
  onOpenModal,
  onDismissInterrupted,
}) => {
  const xpReq = getXpRequiredForLevel(save.level);
  const xpPct = Math.min(100, Math.round((save.xp / xpReq) * 100));
  const claimableMissions = save.missions.filter((m) => m.completed && !m.claimed).length;

  return (
    <div className="ui-overlay" style={{ justifyContent: 'space-between', padding: '12px 16px' }}>
      {/* Top Bar Panoramica: Livello/XP a sinistra, Emblema + Titolo al centro, Valute a destra */}
      <div
        className="interactive"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          className="glass-panel"
          style={{
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f59e0b, #b45309)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: '#111827',
            }}
          >
            {save.level}
          </div>
          <div style={{ minWidth: 125 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0' }}>
              Livello {save.level} • {save.playerName}
            </div>
            <div className="progress-track" style={{ marginTop: 4 }}>
              <div
                className="progress-fill"
                style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg, #38bdf8, #34d399)' }}
              />
            </div>
            <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>
              XP {save.xp} / {xpReq}
            </div>
          </div>
        </div>

        {/* Header Titolo Compatto con Medaglione 3D in Rilievo */}
        <div
          className="glass-panel hero-badge-3d"
          style={{
            padding: '10px 22px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <img
            src="/assets/ui/relic_emblem.jpg"
            alt="Emblema Reliquia dell'Eclissi"
            className="emblem-medallion"
          />
          <div style={{ textAlign: 'left' }}>
            <div
              style={{
                fontSize: '0.7rem',
                letterSpacing: '0.24em',
                color: '#fbbf24',
                fontWeight: 800,
                textTransform: 'uppercase',
                textShadow: '0 2px 6px rgba(0,0,0,0.9)',
              }}
            >
              Avventura Endless 3D
            </div>
            <h1
              className="font-display title-3d-gold"
              style={{
                margin: 0,
                fontSize: 'clamp(1.5rem, 3vw, 2.35rem)',
                lineHeight: 1.0,
              }}
            >
              RELIC RUSH
            </h1>
            <div
              className="font-display subtitle-3d-stone"
              style={{
                fontSize: 'clamp(0.76rem, 1.35vw, 0.96rem)',
                letterSpacing: '0.2em',
                marginTop: 2,
              }}
            >
              LOST KINGDOMS
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="currency-pill" title="Monete">
            <Coins size={17} color="#eab308" />
            <span>{save.coins.toLocaleString('it-IT')}</span>
          </div>
          <div className="currency-pill" title="Cristalli">
            <Gem size={17} color="#38bdf8" />
            <span>{save.crystals.toLocaleString('it-IT')}</span>
          </div>
          {canClaimDaily && (
            <button className="btn btn-emerald" onClick={onClaimDaily}>
              <Gift size={16} />
              <span>Premio Giorno</span>
            </button>
          )}
          <button
            className="btn"
            aria-label="Impostazioni"
            onClick={() => onOpenModal('settings')}
          >
            <Settings size={17} />
          </button>
        </div>
      </div>

      {/* Avviso partita interrotta recuperata */}
      {save.interruptedRunNotice && (
        <div
          className="glass-panel interactive"
          style={{
            alignSelf: 'center',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderColor: '#38bdf8',
          }}
        >
          <ShieldAlert size={18} color="#38bdf8" />
          <span style={{ fontSize: '0.84rem' }}>
            Partita precedente interrotta in modo imprevisto: i tuoi progressi salvati sono al sicuro.
          </span>
          <button className="btn" style={{ padding: '4px 10px' }} onClick={onDismissInterrupted}>
            OK
          </button>
        </div>
      )}

      {/* Dock Inferiore Compatto: il centro resta libero per ammirare protagonista e tempio 3D */}
      <div
        className="interactive"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          marginTop: 'auto',
        }}
      >
        {/* Selettore Modalità & Regno in Rilievo 3D */}
        <div
          className="glass-panel dock-frame-3d"
          style={{
            padding: '14px 18px',
            width: 'min(780px, 96vw)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>
                MODALITÀ
              </span>
              <select
                aria-label="Seleziona modalità di gioco"
                value={save.selectedMode}
                onChange={(e) => onSelectMode(e.target.value as GameModeId)}
                style={{
                  background: '#0f172a',
                  color: '#f8fafc',
                  border: '1px solid rgba(212,168,67,0.45)',
                  borderRadius: 8,
                  padding: '5px 10px',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                }}
              >
                {GAME_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {m.subtitle}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
              {GAME_MODES.find((m) => m.id === save.selectedMode)?.description}
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: '1 1 420px' }}>
              <button
                className={`btn ${save.selectedBiome === 'rotating' ? 'btn-primary' : ''}`}
                style={{ padding: '5px 10px', fontSize: '0.76rem' }}
                onClick={() => onSelectBiome('rotating')}
              >
                <Compass size={14} />
                <span>Alternanza Regni</span>
              </button>
              {BIOME_ORDER.map((bId) => {
                const cfg = BIOMES[bId];
                const unlocked = save.unlockedBiomes.includes(bId);
                const selected = save.selectedBiome === bId;
                return (
                  <button
                    key={bId}
                    disabled={!unlocked}
                    className={`btn ${selected ? 'btn-primary' : ''}`}
                    style={{
                      padding: '5px 10px',
                      fontSize: '0.76rem',
                      borderColor: unlocked && !selected ? `${cfg.accentHex}66` : undefined,
                    }}
                    title={unlocked ? cfg.description : `Sbloccabile al Livello ${cfg.unlockLevel} o con le Sfide dei Regni`}
                    onClick={() => onSelectBiome(bId)}
                  >
                    {!unlocked ? (
                      <Lock size={12} />
                    ) : (
                      <span
                        aria-hidden="true"
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: cfg.accentHex,
                          boxShadow: `0 0 8px ${cfg.accentHex}`,
                          display: 'inline-block',
                        }}
                      />
                    )}
                    <span>{cfg.name}</span>
                  </button>
                );
              })}
            </div>

            <button
              className="btn btn-primary btn-play-3d"
              onClick={onPlay}
            >
              <Play size={22} fill="currentColor" />
              <span>INIZIA LA FUGA</span>
            </button>
          </div>
        </div>

        {/* Barra Navigazione Inferiore con Tasti 3D in Rilievo */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            paddingBottom: '4px',
          }}
        >
          <button className="btn nav-btn-3d" onClick={() => onOpenModal('characters')}>
            <User size={16} color="#38bdf8" />
            <span>Personaggi</span>
          </button>
          <button className="btn nav-btn-3d" onClick={() => onOpenModal('upgrades')}>
            <Zap size={16} color="#eab308" />
            <span>Potenziamenti</span>
          </button>
          <button className="btn nav-btn-3d" onClick={() => onOpenModal('missions')} style={{ position: 'relative' }}>
            <Target size={16} color="#34d399" />
            <span>Missioni</span>
            {claimableMissions > 0 && (
              <span
                style={{
                  background: 'linear-gradient(180deg, #f87171, #dc2626)',
                  color: '#fff',
                  borderRadius: 999,
                  padding: '2px 7px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  boxShadow: '0 2px 6px rgba(239,68,68,0.6)',
                }}
              >
                {claimableMissions}
              </span>
            )}
          </button>
          <button className="btn nav-btn-3d" onClick={() => onOpenModal('achievements')}>
            <Award size={16} color="#c084fc" />
            <span>Achievement ({save.unlockedAchievements.length}/32)</span>
          </button>
          <button className="btn nav-btn-3d" onClick={() => onOpenModal('collection')}>
            <Crown size={16} color="#fbbf24" />
            <span>Collezione</span>
          </button>
          <button className="btn nav-btn-3d" onClick={() => onOpenModal('stats')}>
            <BarChart3 size={16} color="#f97316" />
            <span>Statistiche</span>
          </button>
          <button className="btn nav-btn-3d hide-mobile" onClick={() => onOpenModal('settings')}>
            <Sparkles size={16} color="#94a3b8" />
            <span>Record: {save.stats.bestScore.toLocaleString('it-IT')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

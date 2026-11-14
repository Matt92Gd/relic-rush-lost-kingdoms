import React from 'react';
import { Award, Coins, Gem, Home, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import { BIOMES, getXpRequiredForLevel } from '../data/gameCatalog';
import type { RunSummaryResult } from '../core/GameStateManager';
import type { SaveData } from '../types/game.types';

interface GameOverModalProps {
  summary: RunSummaryResult;
  save: SaveData;
  canRevive: boolean;
  reviveCost: number;
  onRevive: () => void;
  onRetry: () => void;
  onMenu: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  summary,
  save,
  canRevive,
  reviveCost,
  onRevive,
  onRetry,
  onMenu,
}) => {
  const { telemetry, xpResult, completedMissions, unlockedAchievements } = summary;
  const xpReq = getXpRequiredForLevel(save.level);
  const xpPct = Math.min(100, Math.round((save.xp / xpReq) * 100));

  return (
    <div className="modal-backdrop">
      <div className="glass-panel modal-shell" style={{ maxWidth: 540 }}>
        <div className="modal-header" style={{ justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
          {telemetry.isNewRecord && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(234, 179, 8, 0.2)',
                border: '1px solid #eab308',
                color: '#fde047',
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 800,
              }}
            >
              <Trophy size={14} /> NUOVO RECORD PERSONALE!
            </span>
          )}
          <h2 className="font-display" style={{ margin: 0, color: '#f8fafc', fontSize: '1.55rem' }}>
            FINE DELLA FUGA
          </h2>
          <div style={{ fontSize: '0.84rem', color: '#fca5a5' }}>{telemetry.deathReason}</div>
        </div>

        <div className="modal-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 10,
            }}
          >
            <div className="glass-card" style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>PUNTEGGIO FINALE</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fde047' }}>
                {telemetry.score.toLocaleString('it-IT')}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                Record: {save.stats.bestScore.toLocaleString('it-IT')}
              </div>
            </div>

            <div className="glass-card" style={{ padding: 12, textAlign: 'center' }}>
              <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>DISTANZA PERCORSA</div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#38bdf8' }}>
                {telemetry.distance.toLocaleString('it-IT')} m
              </div>
              <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>
                Record: {save.stats.bestDistance.toLocaleString('it-IT')} m
              </div>
            </div>

            <div className="glass-card" style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Coins size={18} color="#eab308" />
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Monete Ottenute</div>
                <div style={{ fontWeight: 800 }}>+{telemetry.coins}</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Gem size={18} color="#38bdf8" />
              <div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Cristalli Guadagnati</div>
                <div style={{ fontWeight: 800 }}>+{telemetry.crystalsEarned}</div>
              </div>
            </div>
          </div>

          {/* Barra XP & Level Up */}
          <div className="glass-card" style={{ padding: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 700 }}>
              <span>Livello {save.level}</span>
              <span style={{ color: '#34d399' }}>+{xpResult.xpAdded} XP</span>
            </div>
            <div className="progress-track" style={{ marginTop: 6 }}>
              <div
                className="progress-fill"
                style={{ width: `${xpPct}%`, background: 'linear-gradient(90deg, #38bdf8, #34d399)' }}
              />
            </div>
            {xpResult.levelsGained > 0 && (
              <div style={{ marginTop: 6, fontSize: '0.8rem', color: '#fde047', fontWeight: 700 }}>
                <Sparkles size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Salito al Livello {xpResult.newLevel}! (+{xpResult.rewardCoins} Monete, +{xpResult.rewardCrystals} Cristalli)
              </div>
            )}
            {xpResult.newlyUnlockedBiomes.length > 0 && (
              <div style={{ marginTop: 4, fontSize: '0.8rem', color: '#34d399', fontWeight: 700 }}>
                Nuovi Regni Sbloccati: {xpResult.newlyUnlockedBiomes.map((b) => BIOMES[b].name).join(', ')}
              </div>
            )}
          </div>

          {(completedMissions.length > 0 || unlockedAchievements.length > 0) && (
            <div className="glass-card" style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {completedMissions.map((m) => (
                <div key={m.id} style={{ fontSize: '0.82rem', color: '#34d399', fontWeight: 700 }}>
                  Missione Completata: {m.title}
                </div>
              ))}
              {unlockedAchievements.map((a) => (
                <div key={a.id} style={{ fontSize: '0.82rem', color: '#c084fc', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Award size={14} /> Achievement: {a.title} (+{a.rewardCrystals} Cristalli)
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-primary"
              disabled={!canRevive}
              onClick={onRevive}
              style={{
                padding: '13px 16px',
                background: canRevive
                  ? 'linear-gradient(135deg, #06b6d4, #2563eb)'
                  : 'rgba(30, 41, 59, 0.7)',
                opacity: canRevive ? 1 : 0.55,
                cursor: canRevive ? 'pointer' : 'not-allowed',
              }}
            >
              <Gem size={18} />
              <span>
                Rianima e Continua ({reviveCost}{' '}
                {reviveCost === 1 ? 'Cristallo' : 'Cristalli'})
              </span>
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-primary" style={{ flex: 1, padding: '12px' }} onClick={onRetry}>
                <RotateCcw size={18} />
                <span>Riprova Subito</span>
              </button>
              <button className="btn" style={{ flex: 1, padding: '12px' }} onClick={onMenu}>
                <Home size={18} />
                <span>Menu Principale</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

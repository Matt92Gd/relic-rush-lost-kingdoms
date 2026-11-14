import React, { useEffect, useRef, useState } from 'react';
import {
  Clock,
  Coins,
  Compass,
  Flame,
  Pause,
  ShieldAlert,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { eventBus } from '../core/EventBus';
import { BIOMES, POWERUP_INFO } from '../data/gameCatalog';
import type {
  ActiveDynamicEvent,
  ActivePowerUpState,
  BiomeId,
  RunTelemetry,
  TutorialStep,
} from '../types/game.types';

const STAGE_METERS = 220;

interface HUDProps {
  telemetry: RunTelemetry;
  powerUps: ActivePowerUpState[];
  activeEvent: ActiveDynamicEvent | null;
  tutorialStep: TutorialStep | null;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onTriggerOverdrive?: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  telemetry,
  powerUps,
  activeEvent,
  tutorialStep,
  isMuted,
  onToggleMute,
  onPause,
  onTriggerOverdrive,
}) => {
  const [popups, setPopups] = useState<
    Array<{ id: number; text: string; subtext?: string; color: string }>
  >([]);
  const [biomeBanner, setBiomeBanner] = useState<BiomeId | null>(null);
  const distRef = useRef(telemetry.distance);
  distRef.current = telemetry.distance;

  useEffect(() => {
    const timers: number[] = [];
    const unsubJuice = eventBus.on('juice:popup', (payload) => {
      setPopups((prev) => [...prev.slice(-2), payload]);
      const t = window.setTimeout(() => {
        setPopups((prev) => prev.filter((p) => p.id !== payload.id));
      }, 1150);
      timers.push(t);
    });
    const unsubBiome = eventBus.on('biome:changed', ({ biome, previousBiome }) => {
      if (!previousBiome && distRef.current < 10) return;
      setBiomeBanner(biome);
      const bt = window.setTimeout(() => {
        setBiomeBanner((cur) => (cur === biome ? null : cur));
      }, 2500);
      timers.push(bt);
    });
    return () => {
      unsubJuice();
      unsubBiome();
      for (const t of timers) {
        window.clearTimeout(t);
      }
    };
  }, []);

  const biomeCfg = BIOMES[telemetry.currentBiome];
  const bannerCfg = biomeBanner ? BIOMES[biomeBanner] : null;
  const distInStage = Math.floor(telemetry.distance) % STAGE_METERS;
  const remainingStageMeters = STAGE_METERS - distInStage;
  const stagePct = Math.min(100, Math.round((distInStage / STAGE_METERS) * 100));
  const threatPct = Math.round(telemetry.enemyThreat * 100);
  const isDanger = telemetry.enemyThreat > 0.55;
  const isTurbo = powerUps.some((p) => p.type === 'turbo');
  const coinStreak = telemetry.coinStreak ?? 0;
  const isTouch =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  return (
    <>
      {isDanger && <div className="danger-vignette" aria-hidden="true" />}
      {isTurbo && <div className="turbo-speedlines" aria-hidden="true" />}
      {bannerCfg && (
        <>
          <div
            className="biome-transition-veil"
            aria-hidden="true"
            style={{
              background: `radial-gradient(circle at center, transparent 44%, ${bannerCfg.accentHex}38 82%, ${bannerCfg.accentHex}75 100%)`,
            }}
          />
          <div
            className="biome-transition-banner glass-panel"
            role="status"
            style={{ borderColor: bannerCfg.accentHex }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.18em',
                color: bannerCfg.accentHex,
              }}
            >
              <Compass size={14} />
              <span>NUOVO REGNO RAGGIUNTO</span>
            </div>
            <div
              className="font-display"
              style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fef08a', marginTop: 2 }}
            >
              {bannerCfg.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#cbd5e1', marginTop: 2 }}>
              {bannerCfg.subtitle}
            </div>
          </div>
        </>
      )}
      {popups.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: 78,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {popups.map((p) => (
            <div
              key={p.id}
              className="glass-panel"
              style={{
                padding: '6px 14px',
                borderColor: p.color,
                background: 'rgba(10, 14, 24, 0.84)',
                boxShadow: `0 0 18px ${p.color}55`,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 900,
                letterSpacing: '0.04em',
              }}
            >
              <span style={{ color: p.color, fontSize: '0.95rem' }}>{p.text}</span>
              {p.subtext && (
                <span style={{ color: '#f8fafc', fontSize: '0.8rem', opacity: 0.92 }}>
                  {p.subtext}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="ui-overlay" style={{ padding: '12px 16px', justifyContent: 'space-between', zIndex: 2 }}>
      {/* Top Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        {/* Sinistra: Punteggio, Distanza, Monete */}
        <div
          className="glass-panel"
          style={{
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 165,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fef08a' }}>
              {Math.floor(telemetry.score).toLocaleString('it-IT')}
            </span>
            <span
              style={{
                background: 'rgba(245, 158, 11, 0.22)',
                border: '1px solid #f59e0b',
                color: '#fde047',
                borderRadius: 6,
                padding: '1px 6px',
                fontSize: '0.75rem',
                fontWeight: 800,
              }}
            >
              {telemetry.multiplier}x
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.85rem', color: '#e2e8f0' }}>
            <span>
              <strong>{Math.floor(telemetry.distance)}</strong> m
            </span>
            <span>
              <strong>{Math.round(telemetry.speed * 3.6)}</strong> km/h
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Coins size={14} color="#eab308" />
              <strong>{telemetry.coins}</strong>
            </span>
          </div>

          <div style={{ fontSize: '0.72rem', color: biomeCfg.accentHex, fontWeight: 700 }}>
            {biomeCfg.name}
          </div>
          {telemetry.selectedBiome === 'rotating' && (
            <div style={{ marginTop: 2 }}>
              <div style={{ fontSize: '0.65rem', color: '#cbd5e1', marginBottom: 2 }}>
                Prossimo Regno: {remainingStageMeters} m
              </div>
              <div className="progress-track" style={{ height: 4 }}>
                <div
                  className="progress-fill"
                  style={{ width: `${stagePct}%`, background: biomeCfg.accentHex }}
                />
              </div>
            </div>
          )}
          {coinStreak >= 3 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#facc15',
              }}
            >
              <Flame size={12} color="#facc15" />
              <span>Serie x{coinStreak}</span>
            </div>
          )}
        </div>

        {/* Centro: Svolte imminenti, Eventi Dinamici o Timer Time Attack */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          {telemetry.upcomingTurn && (
            <div
              className="glass-panel"
              style={{
                padding: '6px 16px',
                borderColor: '#facc15',
                background: 'rgba(66, 32, 6, 0.88)',
                color: '#fef08a',
                fontWeight: 900,
                fontSize: '0.86rem',
                letterSpacing: '0.06em',
                boxShadow: '0 0 18px rgba(250, 204, 21, 0.35)',
              }}
            >
              {telemetry.upcomingTurn === 'left'
                ? '⬅ SVOLTA A SINISTRA'
                : telemetry.upcomingTurn === 'right'
                  ? 'SVOLTA A DESTRA ➡'
                  : '⬅ BIVIO: SCEGLI DIREZIONE ➡'}
            </div>
          )}

          {telemetry.timeRemainingSeconds !== null && (
            <div
              className="glass-panel"
              style={{
                padding: '6px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                borderColor: telemetry.timeRemainingSeconds < 15 ? '#ef4444' : '#f97316',
              }}
            >
              <Clock size={16} color="#fb923c" />
              <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                {Math.ceil(telemetry.timeRemainingSeconds)}s
              </span>
            </div>
          )}

          {activeEvent && (
            <div
              className="glass-panel"
              style={{
                padding: '8px 14px',
                borderColor: activeEvent.warningSeconds > 0 ? '#ef4444' : '#f97316',
                background: 'rgba(40, 14, 14, 0.88)',
                textAlign: 'center',
                maxWidth: 320,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontWeight: 800, fontSize: '0.85rem', color: '#fca5a5' }}>
                <Flame size={15} />
                <span>
                  {activeEvent.warningSeconds > 0
                    ? `ALLERTA: ${activeEvent.title}`
                    : activeEvent.title}
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#fecaca', marginTop: 2 }}>
                {activeEvent.description}
              </div>
              <div className="progress-track" style={{ marginTop: 5, height: 5 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.max(0, (activeEvent.remainingSeconds / activeEvent.totalDurationSeconds) * 100)}%`,
                    background: '#f97316',
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Destra: Audio Mute, Pausa & Minaccia Malakor */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              className="btn interactive"
              aria-label={isMuted ? 'Attiva Audio' : 'Silenzia Audio'}
              onClick={onToggleMute}
              style={{ padding: '10px 12px' }}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              className="btn interactive"
              aria-label="Pausa"
              onClick={onPause}
              style={{ padding: '10px 12px' }}
            >
              <Pause size={18} />
            </button>
          </div>

          <div
            className="glass-panel"
            style={{
              padding: '6px 10px',
              minWidth: 118,
              borderColor: threatPct > 65 ? '#ef4444' : 'rgba(255,255,255,0.14)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', color: threatPct > 65 ? '#fca5a5' : '#94a3b8' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <ShieldAlert size={12} />
                Malakor
              </span>
              <span>{threatPct}%</span>
            </div>
            <div className="progress-track" style={{ marginTop: 4, height: 5 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${threatPct}%`,
                  background: threatPct > 65 ? '#ef4444' : '#c084fc',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial Interattivo (se attivo) */}
      {tutorialStep && (
        <div
          className="glass-panel"
          style={{
            alignSelf: 'center',
            padding: '12px 18px',
            borderColor: '#38bdf8',
            textAlign: 'center',
            maxWidth: 460,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#38bdf8', fontWeight: 800, fontSize: '0.88rem' }}>
            <Sparkles size={15} />
            <span>TUTORIAL: {tutorialStep.title}</span>
          </div>
          <div style={{ marginTop: 4, fontSize: '0.92rem', fontWeight: 600 }}>
            {isTouch ? tutorialStep.instructionMobile : tutorialStep.instructionDesktop}
          </div>
        </div>
      )}

      {/* Bottom: Power-Up Attivi + Impulso Eclissi */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {powerUps.map((pu) => {
            const info = POWERUP_INFO[pu.type];
            const pct = Math.max(
              0,
              Math.min(100, (pu.remainingSeconds / pu.totalDurationSeconds) * 100)
            );
            return (
              <div
                key={pu.type}
                className="glass-panel"
                style={{
                  padding: '6px 10px',
                  minWidth: 112,
                  borderColor: info.color,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <span style={{ color: info.color }}>{info.name}</span>
                  <span>{pu.remainingSeconds.toFixed(1)}s</span>
                </div>
                <div className="progress-track" style={{ marginTop: 4, height: 4 }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: info.color }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Barra/Bottone Impulso Eclissi */}
        {(() => {
          const charge = Math.max(0, Math.min(100, telemetry.overdriveCharge ?? 0));
          const ready = charge >= 100;
          return (
            <button
              type="button"
              className="glass-panel"
              onClick={() => ready && onTriggerOverdrive?.()}
              disabled={!ready}
              style={{
                pointerEvents: 'auto',
                cursor: ready ? 'pointer' : 'default',
                padding: '7px 12px',
                minWidth: 175,
                borderColor: ready ? '#facc15' : 'rgba(245, 158, 11, 0.35)',
                background: ready
                  ? 'linear-gradient(135deg, rgba(217, 119, 6, 0.92), rgba(234, 88, 12, 0.92))'
                  : 'rgba(15, 23, 42, 0.78)',
                boxShadow: ready ? '0 0 22px rgba(245, 158, 11, 0.55)' : undefined,
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  fontSize: '0.76rem',
                  fontWeight: 800,
                  color: ready ? '#fffbeb' : '#fde68a',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Zap size={14} color={ready ? '#fffbeb' : '#f59e0b'} />
                  {ready ? 'IMPULSO PRONTO! [E]' : 'Impulso Eclissi'}
                </span>
                <span>{Math.floor(charge)}%</span>
              </div>
              <div className="progress-track" style={{ marginTop: 5, height: 5 }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${charge}%`,
                    background: ready ? '#fef08a' : '#f59e0b',
                  }}
                />
              </div>
            </button>
          );
        })()}
      </div>
    </div>
    </>
  );
};

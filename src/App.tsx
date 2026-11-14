import React, { useEffect, useRef, useState } from 'react';
import { eventBus } from './core/EventBus';
import { GameStateManager, type RunSummaryResult } from './core/GameStateManager';
import { AudioManager } from './audio/AudioManager';
import { GameEngine } from './engine/GameEngine';
import { MainMenu, type MenuModalId } from './ui/MainMenu';
import { HUD } from './ui/HUD';
import { PauseModal } from './ui/PauseModal';
import { GameOverModal } from './ui/GameOverModal';
import { CharactersModal } from './ui/CharactersModal';
import { ShopUpgradesModal } from './ui/ShopUpgradesModal';
import { MissionsModal } from './ui/MissionsModal';
import { AchievementsModal } from './ui/AchievementsModal';
import { CollectionModal } from './ui/CollectionModal';
import { StatsModal } from './ui/StatsModal';
import { SettingsModal } from './ui/SettingsModal';
import { DebugOverlay } from './ui/DebugOverlay';
import type {
  ActiveDynamicEvent,
  ActivePowerUpState,
  GameSettings,
  GameState,
  PerformanceMetrics,
  RunTelemetry,
  SaveData,
  TutorialStep,
} from './types/game.types';

interface ToastItem {
  id: number;
  title: string;
  subtitle?: string;
}

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const stateManagerRef = useRef<GameStateManager | null>(null);
  const audioRef = useRef<AudioManager | null>(null);

  const [gameState, setGameState] = useState<GameState>('MENU');
  const [saveData, setSaveData] = useState<SaveData | null>(null);
  const [telemetry, setTelemetry] = useState<RunTelemetry | null>(null);
  const [powerUps, setPowerUps] = useState<ActivePowerUpState[]>([]);
  const [activeEvent, setActiveEvent] = useState<ActiveDynamicEvent | null>(null);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep | null>(null);
  const [summary, setSummary] = useState<RunSummaryResult | null>(null);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTimeMs: 16.7,
    activeSegments: 0,
    pooledSegments: 0,
    activeMeshes: 0,
    renderScale: 1,
    qualityPreset: 'high',
  });
  const [activeModal, setActiveModal] = useState<MenuModalId>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gsm = new GameStateManager();
    const audio = new AudioManager();
    stateManagerRef.current = gsm;
    audioRef.current = audio;

    setSaveData(gsm.saveManager.cloneSave());
    setTelemetry(gsm.getTelemetry());

    const engine = new GameEngine(canvas, gsm, audio);
    engineRef.current = engine;

    const unsubs = [
      eventBus.on('state:changed', ({ state }) => {
        setGameState(state);
        if (state === 'GAME_OVER') {
          setSummary(gsm.getLastSummary());
        } else if (state === 'PLAYING' || state === 'TUTORIAL') {
          setSummary(null);
        }
      }),
      eventBus.on('save:updated', (nextSave) => setSaveData(nextSave)),
      eventBus.on('telemetry:updated', (t) => setTelemetry(t)),
      eventBus.on('powerups:updated', (list) => setPowerUps([...list])),
      eventBus.on('event:updated', (ev) => setActiveEvent(ev)),
      eventBus.on('tutorial:step', (step) => setTutorialStep(step)),
      eventBus.on('performance:updated', (m) => setMetrics(m)),
      eventBus.on('toast:message', ({ title, subtitle }) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev.slice(-2), { id, title, subtitle }]);
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((item) => item.id !== id));
        }, 3200);
      }),
    ];

    return () => {
      for (const u of unsubs) u();
      engine.dispose();
      audio.dispose();
    };
  }, []);

  // Tasto INVIO per confermare nei menu / game over, ESC in game over per tornare al menu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (activeModal) return;
      if (e.key === 'Enter') {
        if (gameState === 'MENU' || gameState === 'GAME_OVER') {
          engineRef.current?.startRun();
        }
      } else if (e.key === 'Escape' && gameState === 'GAME_OVER') {
        engineRef.current?.returnToMenu();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [gameState, activeModal]);

  const gsm = stateManagerRef.current;
  const eng = engineRef.current;
  const activeSummary = summary ?? gsm?.getLastSummary() ?? null;

  const handleUpdateSettings = (patch: Partial<GameSettings>) => {
    if (!gsm || !eng) return;
    const data = gsm.saveManager.getData();
    Object.assign(data.settings, patch);
    gsm.saveManager.save();
    eng.syncSettingsAndCustomization();
  };

  return (
    <div className="app-root">
      <canvas ref={canvasRef} className="game-canvas" />

      {/* Toast notifiche */}
      {toasts.length > 0 && (
        <div className="toast-stack">
          {toasts.map((t) => (
            <div key={t.id} className="toast-item">
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#fde047' }}>{t.title}</div>
              {t.subtitle && (
                <div style={{ fontSize: '0.76rem', color: '#e2e8f0', marginTop: 2 }}>{t.subtitle}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Menu Principale */}
      {gameState === 'MENU' && saveData && gsm && eng && (
        <MainMenu
          save={saveData}
          canClaimDaily={gsm.economy.canClaimDailyReward()}
          onPlay={() => {
            setActiveModal(null);
            eng.startRun();
          }}
          onSelectMode={(mode) => {
            const d = gsm.saveManager.getData();
            d.selectedMode = mode;
            gsm.saveManager.save();
            eventBus.emit('audio:sfx', { sfx: 'ui_click' });
          }}
          onSelectBiome={(biome) => {
            gsm.progression.selectBiome(biome);
            eventBus.emit('audio:sfx', { sfx: 'ui_click' });
          }}
          onClaimDaily={() => {
            gsm.economy.claimDailyReward();
          }}
          onOpenModal={(m) => {
            audioRef.current?.unlock();
            eventBus.emit('audio:sfx', { sfx: 'ui_click' });
            setActiveModal(m);
          }}
          onDismissInterrupted={() => gsm.saveManager.dismissInterruptedNotice()}
        />
      )}

      {/* HUD In-Game */}
      {(gameState === 'PLAYING' || gameState === 'TUTORIAL' || gameState === 'PAUSED') &&
        telemetry &&
        eng && (
          <HUD
            telemetry={telemetry}
            powerUps={powerUps}
            activeEvent={activeEvent}
            tutorialStep={tutorialStep}
            isMuted={Boolean(saveData?.settings.muted)}
            onToggleMute={() =>
              handleUpdateSettings({ muted: !saveData?.settings.muted })
            }
            onPause={() => eng.pauseRun()}
            onTriggerOverdrive={() => eng.triggerOverdrive()}
          />
        )}

      {/* Pausa */}
      {gameState === 'PAUSED' && telemetry && eng && !activeModal && (
        <PauseModal
          distance={telemetry.distance}
          score={telemetry.score}
          onResume={() => eng.resumeRun()}
          onRestart={() => eng.startRun()}
          onOpenSettings={() => setActiveModal('settings')}
          onMenu={() => eng.returnToMenu()}
        />
      )}

      {/* Game Over */}
      {gameState === 'GAME_OVER' && activeSummary && saveData && gsm && eng && (
        <GameOverModal
          summary={activeSummary}
          save={saveData}
          canRevive={gsm.canRevive()}
          reviveCost={gsm.getReviveCost()}
          onRevive={() => eng.reviveRun()}
          onRetry={() => eng.startRun()}
          onMenu={() => eng.returnToMenu()}
        />
      )}

      {/* Modali di Progressione & Gestione */}
      {saveData && gsm && eng && activeModal === 'characters' && (
        <CharactersModal
          save={saveData}
          onClose={() => setActiveModal(null)}
          onSelectOrUnlockCharacter={(id) => {
            gsm.inventory.unlockOrSelectCharacter(id);
            eng.syncSettingsAndCustomization();
          }}
          onSetColor={(id, hex) => {
            gsm.inventory.setCharacterColor(id, hex);
            eng.syncSettingsAndCustomization();
          }}
          onSelectOrUnlockAccessory={(id) => {
            gsm.inventory.unlockOrSelectAccessory(id);
            eng.syncSettingsAndCustomization();
          }}
          onSelectOrUnlockTrail={(id) => {
            gsm.inventory.unlockOrSelectTrail(id);
            eng.syncSettingsAndCustomization();
          }}
          onSetCelebration={(style) => gsm.inventory.setCelebration(style)}
        />
      )}

      {saveData && gsm && activeModal === 'upgrades' && (
        <ShopUpgradesModal
          save={saveData}
          onClose={() => setActiveModal(null)}
          onBuyUpgrade={(id) => gsm.economy.purchaseUpgrade(id)}
        />
      )}

      {saveData && gsm && activeModal === 'missions' && (
        <MissionsModal
          save={saveData}
          onClose={() => setActiveModal(null)}
          onClaimMission={(id) => gsm.missions.claimMission(id)}
        />
      )}

      {saveData && activeModal === 'achievements' && (
        <AchievementsModal save={saveData} onClose={() => setActiveModal(null)} />
      )}

      {saveData && activeModal === 'collection' && (
        <CollectionModal save={saveData} onClose={() => setActiveModal(null)} />
      )}

      {saveData && activeModal === 'stats' && (
        <StatsModal save={saveData} onClose={() => setActiveModal(null)} />
      )}

      {saveData && gsm && eng && activeModal === 'settings' && (
        <SettingsModal
          save={saveData}
          onClose={() => setActiveModal(null)}
          onUpdateSettings={handleUpdateSettings}
          onExportSave={() => gsm.saveManager.exportSave()}
          onImportSave={(json) => {
            const ok = gsm.saveManager.importSave(json);
            if (ok) eng.syncSettingsAndCustomization();
            return ok;
          }}
          onResetSave={() => {
            gsm.saveManager.resetSave();
            gsm.missions.ensureMissionsInitialized();
            eng.syncSettingsAndCustomization();
          }}
        />
      )}

      {/* Debug Panel Opzionale */}
      {saveData?.settings.showDebugPanel && telemetry && (
        <DebugOverlay metrics={metrics} telemetry={telemetry} />
      )}
    </div>
  );
};

export default App;

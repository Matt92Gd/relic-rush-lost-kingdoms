# ROADMAP — RELIC RUSH: LOST KINGDOMS

## Stato Complessivo
- [x] **Fase 0 — Analisi, Setup & Documentazione Base** *(Completata)*
- [x] **Fase 1 — Fondamenta Giocabili** *(Implementata + Test unitari superati + Verificata in browser)*
- [x] **Fase 2 — Esperienza di Gioco** *(Implementata + Test unitari superati + Verificata in browser)*
- [x] **Fase 3 — Progressione & Persistenza** *(Implementata + Test unitari superati + Verificata in browser)*
- [x] **Fase 4 — Contenuti Avanzati** *(Implementata + Test unitari superati)*
- [x] **Fase 5 — Polish, Ottimizzazione & Test Automatici** *(Implementata + Vitest 10/10 superati + Restyling 3D morbido + Audio orchestrale Web Audio)*
- [x] **Fase 6 — Verifica Browser & Preparazione Pubblicazione** *(`tsc`, `vitest` 10/10 e `npm run build` superati; verifica E2E browser su `http://localhost:5173/` completata con 0 errori console/rete, Menu -> Gameplay -> Game Over -> Menu verificati)*

---

## Dettaglio Fasi e Stato Reale

### Fase 1 — Fondamenta Giocabili
- [x] Configurazione Vite + TypeScript + Babylon.js + React + Vitest (`package.json`, `tsconfig.json`, `vite.config.ts`).
- [x] `GameEngine` con scena 3D, luci, nebbia, skydome, pipeline ACES/Bloom e loop render.
- [x] `CharacterMeshBuilder` + `PlayerController` (corsa, 3 corsie, salto, scivolata, svolte 90°, input buffering 220ms).
- [x] `CameraController` fluida con orientamento alle curve e FOV dinamico.
- [x] `TrackMath` + `ProceduralWorldGenerator` con `SeededRandom` e `SolvabilityValidator`.
- [x] Ostacoli base e collisioni deterministiche accurate (`ObstacleSystem.evaluateCollision`).
- [x] `GameStateManager`: avvio partita, punteggio, game over e riavvio immediato.

### Fase 2 — Esperienza di Gioco
- [x] Modelli procedurali dettagliati per ambiente e protagonista con animazioni su tutte le 11+ pose.
- [x] Tutte le 15 tipologie di ostacoli con segnalazione visiva e animazioni (`ObstacleSystem`).
- [x] Nemico inseguitore `EnemyAI` (*Malakor*) con logica minaccia/inciampo/recupero/cattura.
- [x] Monete, cristalli e tutti i 7 Power-Up (`PowerUpSystem`).
- [x] `AudioManager` Web Audio API completo (musica adattiva per bioma e tutti gli SFX).
- [x] HUD di gioco reattivo (`HUD.tsx`), Menu principale (`MainMenu.tsx`) e Modali pausa / game over.

### Fase 3 — Progressione & Persistenza
- [x] `SaveManager` (`localStorage` + `IndexedDB`, migrazione v1->v2, riparazione corruzione, export/import).
- [x] `EconomySystem` (Monete, Cristalli, 6 potenziamenti permanenti a 5 livelli, premio giornaliero).
- [x] `ProgressionSystem` (Livelli 1-50, XP, ricompense e sblocchi biomi).
- [x] `MissionSystem` (Giornaliere, Settimanali, Permanenti, 15 Sfide dei Regni).
- [x] `AchievementSystem` (32 Achievement con notifiche animate).
- [x] `InventorySystem` (6 Personaggi, varianti colore, accessori, 5 scie, pose celebrative).
- [x] `StatsModal` (statistiche dettagliate e record locali + Daily Seed locale).

### Fase 4 — Contenuti Avanzati
- [x] Tutti i 5 Biomi distinti (`jungle`, `volcano`, `sky`, `desert`, `shadow`) con transizione dinamica e ciclo giorno/notte (`EnvironmentManager`).
- [x] Sistema Reliquie (`RelicSystem`: 5 Reliquie × 3 Frammenti raccoglibili + bonus passivi).
- [x] 6 Eventi Dinamici (`DynamicEventSystem`).
- [x] 7 Modalità di gioco incluso `daily_seed` condivisibile.
- [x] `TutorialSystem` interattivo iniziale.

### Fase 5 — Polish, Ottimizzazione & Test Automatici
- [x] 4 Preset grafici (`low`, `medium`, `high`, `ultra`) + `PerformanceManager` con scaling adattivo.
- [x] Pannello Debug opzionale (`DebugOverlay.tsx`).
- [x] Controlli mobile touch swipe + inclinazione opzionale (`DeviceOrientationEvent`).
- [x] Suite completa di test unitari/integrazione con Vitest (`src/__tests__/game.test.ts` — 10/10 superati).

### Fase 6 — Preparazione Pubblicazione & Verifica Browser
- [x] Restyling grafico 3D/UI completato (11 texture/artwork `.jpg` in `public/assets/`, mesh levigate `flat: false` ad alta tessellazione, `GlowLayer` calibrato, skydome panoramici con `emissiveColor = (0,0,0)`, layout menu panoramico, vignetta di pericolo e speed-lines Turbo).
- [x] Nuovo sintetizzatore musicale polifonico multi-traccia Web Audio API con `ConvolverNode` e compressore master in `src/audio/AudioManager.ts`.
- [x] Build di produzione pulita (`npm run build` completata in `12.83s` senza errori) e `10/10` test Vitest superati.
- [x] Documentazione di avvio (`README.md`), cronologia (`PROGRESS.md`) e manifest PWA (`public/manifest.json`).
- [x] Verifica licenze aggiornata (`ASSET_LICENSES.md`).
- [x] Verifica E2E reale nel browser su `http://localhost:5173/` (viewport `1280x800`: Menu Principale, Modali, Corsa/Salto/Scivolata, Game Over `FINE DELLA FUGA` e ritorno funzionante al Menu Principale con 0 errori console/rete).
- [ ] Verifica visiva aggiuntiva su dispositivo Android fisico / viewport touch e ascolto soggettivo colonna sonora su hardware locale dell'utente.

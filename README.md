<div align="center">

# RELIC RUSH: LOST KINGDOMS

**Endless Runner 3D procedurale in tempo reale ambientato tra cinque regni perduti**

[![Babylon.js](https://img.shields.io/badge/Babylon.js-7.x-BB464B?style=for-the-badge&logo=babylondotjs&logoColor=white)](https://www.babylonjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-2.x-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![WebGL2](https://img.shields.io/badge/WebGL2-3D%20Engine-990000?style=for-the-badge)](https://get.webgl.org/)

</div>

---

## Descrizione e Caratteristiche Principali

**Relic Rush: Lost Kingdoms** è un endless runner 3D sviluppato con **Babylon.js**, **TypeScript**, **React**, **Vite** e **Web Audio API**. Dopo aver sottratto l’*Idolo dell’Eclissi*, il protagonista deve fuggire attraverso rovine sospese e templi millenari mentre viene braccato da **Malakor, il Guardiano dell'Eclissi**.

- **Gameplay su 3 Corsie con Svolte a 90° e Bivi a T (`fork_t`)**: cambio corsia fluido, salto, doppio salto, scivolata (`SLIDE`) e fast-fall con input buffering (220 ms) su svolte e biforcazioni.
- **Inseguimento Dinamico di Malakor**: la minaccia del guardiano sale in caso di inciampi e arretra assorbendo urti con lo Scudo Runico o accelerando.
- **HUD Dinamico in Tempo Reale**: punteggio, distanza in metri, tachimetro `km/h`, indicatore anticipato delle svolte, barra **Impulso Eclissi**, stato minaccia di Malakor e serie combo.
- **15 Tipologie di Ostacoli e 6 Eventi Dinamici**: tronchi caduti, muretti, archi bassi, pilastri crollati, fosse, ponti spezzati, massi rotolanti, lame oscillanti, trappole a pressione, getti di fuoco, lastre fragili, rocce vulcaniche, barriere mobili, meccanismi rotanti e passaggi stretti, affiancati da eventi come crolli, valanghe, eruzioni e inseguimenti intensi.
- **Audio Procedurale Polifonico**: sintetizzatore Web Audio API con riverbero stereo convoluzionale (`ConvolverNode`), lookahead scheduler ed effetti sonori dinamici per ciascun bioma.
- **Qualità Grafica Adattiva**: 4 preset (`low`, `medium`, `high`, `ultra`) gestiti da `PerformanceManager` con scaling dinamico dell'hardware e pipeline di post-processing.

---

## I 5 Regni Perduti

Durante la corsa il tracciato evolve attraversando cinque biomi distinti con illuminazione, nebbia volumetrica, skydome, texture dedicate e ostacoli caratteristici:

| Bioma | Sottotitolo | Atmosfera & Scenario | Ostacoli Caratteristici |
| :--- | :--- | :--- | :--- |
| **Tempio della Giungla** | *Rovine di Smeraldo* | Corridoi in pietra coperti di muschio, alberi, cascate e ponti nella foresta | `fallen_log`, `low_arch`, `broken_bridge`, `chasm_pit`, `swinging_blade` |
| **Regno Vulcanico** | *Fornace di Ossidiana* | Santuari spaccati su fiumi di magma, lapilli incandescenti e cenere | `fire_jet`, `volcanic_rock`, `crumbling_tile`, `chasm_pit`, `rolling_boulder` |
| **Città Celeste** | *Bastioni tra le Nuvole* | Marmo luminoso e oro antico ad alta quota con cristalli d'etere e astrolabi | `rotating_mechanism`, `moving_barrier`, `narrow_path`, `broken_bridge`, `low_arch` |
| **Deserto Perduto** | *Cittadella delle Dune* | Piramidi sepolte, arenaria dorata, obelischi e tempeste di sabbia | `rolling_boulder`, `pressure_trap`, `collapsed_pillar`, `low_wall`, `moving_barrier` |
| **Regno delle Ombre** | *Abisso dell’Eclissi* | Rovine d'ossidiana notturne, monoliti e cristalli bioluminescenti | `swinging_blade`, `rotating_mechanism`, `moving_barrier`, `fire_jet`, `narrow_path` |

---

## Eroi, Personalizzazione e Progressione

### 6 Personaggi Giocabili con Modelli 3D `.glb`
- **Leo Vance** (*Esploratore Audace*) — disponibile da subito con cappello da avventuriero.
- **Maya Lin** (*Archeologa dei Segreti*) — sbloccabile con 500 Monete.
- **Kaelen** (*Guardiano Solare*) — sbloccabile con 1.200 Monete.
- **Nyx** (*Viandante delle Ombre*) — sbloccabile con 15 Cristalli.
- **Talos-VII** (*Automa Antico*) — costrutto corazzato sbloccabile con 25 Cristalli, con elmo con visiera luminosa, reattore pettorale e scudo chiodato.
- **Aethel** (*Sovrana Celeste*) — sbloccabile al Livello Giocatore 10.

Ogni eroe supporta tintura personalizzata dell'abito, accessori equipaggiabili (6 varianti) e scie particellari (5 varianti).

### Potenziamenti, Reliquie e Modalità
- **7 Power-Up sul Tracciato**: *Magnete*, *Scudo Runico*, *Turbo Etereo*, *Moltiplicatore 2x*, *Doppio Salto*, *Clessidra* e *Oro Regale*.
- **6 Upgrade Permanenti** (Liv. 1–5): *Campo Magnetico*, *Egida Antica*, *Fiuto del Tesoriere*, *Maestria Esploratore*, *Sapienza Perduta*, *Risonanza Eterea*.
- **5 Reliquie Antiche (15 Frammenti)**: *Idolo di Giada*, *Cuore di Ossidiania*, *Astrolabio d’Etere*, *Scettro delle Sabbie*, *Corona dell’Eclissi*.
- **32 Achievement**, missioni giornaliere/settimanali/permanenti, sfide dei regni e ricompense di accesso giornaliere su ciclo di 7 giorni.
- **7 Modalità di Gioco**: *Corsa Infinita*, *Percorso Giornaliero* (seed condivisibile), *Corsa a Tempo* (90s), *Sopravvivenza*, *Sfida Pura* (Zero Power-Up), *Alta Velocità* (+45%) e *Pioggia d’Oro* (3x Monete).

---

## Architettura Tecnica e Ottimizzazioni 3D

- **Generatore Procedurale con Validazione (`ProceduralWorldGenerator` + `SolvabilityValidator`)**:
  - Ogni segmento (`straight`, `bridge`, `tunnel`, `elevated`, `narrow`, `turn_left`, `turn_right`, `fork_t`) usa coordinate locali mappate in 3D tramite `TrackMath` e viene verificato prima dello spawn garantendo zone sicure in curva, spazi temporali minimi tra trappole e almeno una corsia superabile in ogni slice.
  - Generazione ammortizzata (`maxNewSegments = 1` per frame in gameplay) e pre-estensione anticipata di entrambi i rami dei bivi `fork_t` con smaltimento immediato del ramo scartato in `resolveFork` per eliminare micro-lag alle svolte.
- **Ottimizzazione Scena & Mesh (`EnvironmentManager` & `CharacterMeshBuilder`)**:
  - Cache delle geometrie icosaedriche con displacement (`icoTemplates`) clonate tra i segmenti, congelamento delle matrici mondo delle mesh statiche (`freezeWorldMatrix()` e `doNotSyncBoundingInfo = true`) e riciclo progressivo dei segmenti già superati.
  - Transizioni atmosferiche fluide tra biomi e sincronizzazione rapida dello yaw ambientale (`smoothYaw`) con la telecamera in curva.
  - Salvataggio persistente locale sincronizzato tra `localStorage` (`relic_rush_save_v2`) e backup asincrono su `IndexedDB` (`RelicRushDB`) con import/export JSON.

---

## Controlli

| Azione | PC (Tastiera) | Mobile (Touch / Giroscopio) |
| :--- | :--- | :--- |
| **Corsia Sinistra / Svolta** | `Freccia Sinistra` / `A` | Swipe Sinistra (o Inclinazione se attivata) |
| **Corsia Destra / Svolta** | `Freccia Destra` / `D` | Swipe Destra (o Inclinazione se attivata) |
| **Salto / Doppio Salto** | `Freccia Su` / `W` / `Spazio` | Swipe Alto |
| **Scivolata / Fast-Fall** | `Freccia Giù` / `S` | Swipe Basso |
| **Pausa / Riprendi** | `ESC` | Pulsante Pausa |
| **Conferma Menu / Riprova** | `Invio` | Tap |

---

## Requisiti e Avvio Rapido

### Requisiti
- **Node.js** `>= 20`
- Browser moderno con supporto **WebGL2** (Chrome, Edge, Firefox, Safari)

### Installazione e Avvio
```bash
git clone https://github.com/Matt92Gd/relic-rush-lost-kingdoms.git
cd relic-rush-lost-kingdoms
npm install
npm run dev
```
Apri l'indirizzo locale mostrato da Vite nel terminale (predefinito: `http://localhost:5173`).

### Script Disponibili
| Comando | Descrizione |
| :--- | :--- |
| `npm run dev` | Avvia il server di sviluppo Vite con HMR |
| `npm test` | Esegue la suite di test automatici con Vitest (`vitest run`) |
| `npm run test:watch` | Esegue Vitest in modalità watch |
| `npm run build` | Verifica i tipi TypeScript (`tsc`) e genera la build di produzione Vite in `dist/` |
| `npm run preview` | Avvia l'anteprima locale della build di produzione |

---

## Struttura del Repository

```text
relic-rush-lost-kingdoms/
├── public/assets/           # Modelli 3D (.glb), texture ad alta risoluzione (.jpg) ed emblema UI
├── scripts/                 # Script di generazione/ispezione modelli 3D .glb
├── src/
│   ├── __tests__/           # Suite di test automatici (Vitest)
│   ├── audio/               # Sintetizzatore musicale e SFX Web Audio API (AudioManager)
│   ├── core/                # EventBus, GameStateManager, SeededRandom
│   ├── data/                # Cataloghi biomi, modalità, eroi, reliquie, upgrade, achievement
│   ├── engine/              # GameEngine (loop Babylon.js) e PerformanceManager
│   ├── entities/            # PlayerController, CharacterMeshBuilder, CameraController, EnemyAI
│   ├── systems/             # Economia, difficoltà/eventi dinamici, missioni, power-up, salvataggi
│   ├── types/               # Tipizzazioni TypeScript condivise
│   ├── ui/                  # Interfaccia React (HUD, MainMenu, modali negozio/personaggi/debug)
│   └── world/               # ProceduralWorldGenerator, EnvironmentManager, ObstacleSystem, TrackMath
├── ARCHITECTURE.md          # Dettaglio architetturale e diagramma dei moduli
├── GAME_DESIGN_DOCUMENT.md  # Game Design Document completo
├── ROADMAP.md               # Piano di sviluppo e milestone
├── PROGRESS.md              # Registro avanzamento, fix e verifiche
└── ASSET_LICENSES.md        # Attribuzioni e licenze degli asset 3D e delle texture
```

---

## Documentazione di Progetto
- [GAME_DESIGN_DOCUMENT.md](./GAME_DESIGN_DOCUMENT.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [ROADMAP.md](./ROADMAP.md)
- [PROGRESS.md](./PROGRESS.md)
- [ASSET_LICENSES.md](./ASSET_LICENSES.md)

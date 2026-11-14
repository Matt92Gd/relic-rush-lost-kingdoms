# ASSET & LICENSES — RELIC RUSH: LOST KINGDOMS

Tutte le risorse del progetto sono originali, generate proceduralmente o distribuite con licenze open-source permissive compatibili con la distribuzione commerciale e open. Nessun asset protetto di terze parti o di *Temple Run* è presente nel progetto.

## 1. Librerie Software
| Pacchetto | Versione | Licenza | Utilizzo |
| :--- | :--- | :--- | :--- |
| `@babylonjs/core` | `^7.0.0` | Apache-2.0 | Motore grafico 3D WebGL2/WebGPU, PBR, particelle, pipeline |
| `react` / `react-dom` | `^18.3.1` | MIT | Interfaccia utente menu, HUD, modali |
| `lucide-react` | `^0.460.0` | ISC | Iconografia UI vettoriale |
| `vite` | `^6.0.0` | MIT | Dev server e bundler di produzione |
| `typescript` | `^5.6.3` | Apache-2.0 | Tipizzazione statica |
| `vitest` / `jsdom` | `^2.1.5` / `^25.0.1` | MIT | Framework test automatici |

## 2. Modelli 3D e Mesh
- **Esploratore e Personaggi Sbloccabili (`src/entities/CharacterMeshBuilder.ts`)**: Geometrie 3D scolpite gerarchiche con torso e fedora modellati tramite `CreateLathe`, arti articolati a due giunti, mantello animato, zaino con lanterna, animazioni scheletriche/giunti procedurali e materiali texturizzati (`hero_outfit.jpg` / `bark_wood.jpg`). Licenza: **Proprietaria del progetto (Originale)**.
- **Malakor, Guardiano dell'Eclissi (`src/entities/EnemyAI.ts`)**: Modello procedurale originale composto da torso `CreateLathe`, corna ricurve, artigli e tentacoli d'ombra modellati con `CreateTube`, doppio anello runico e corazza texturizzata (`malakor_armor.jpg`). Licenza: **Proprietaria del progetto (Originale)**.
- **Ambienti dei 5 Biomi e 15 Tipologie di Ostacoli (`src/world/EnvironmentManager.ts`, `src/world/ObstacleSystem.ts`)**: Alberi organici con tronchi/rami curvi `CreateTube` e chiome `IcoSphere` scolpite con deformazione vertici, portali templari con colonne e architravi monumentali, fondazioni rocciose, pinnacoli lavici, astrolabi celesti, piramidi dorate, obelischi e 15 ostacoli texturizzati con illuminazione calibrata `GlowLayer`. Licenza: **Proprietaria del progetto (Originale)**.

## 3. Texture, Artwork e Materiali
- **Texture 3D Generate ad Alta Risoluzione (`public/assets/textures/`)**:
  - `temple_stone.jpg` (pietra templare maya scolpita con muschio e rune dorate — Bioma *Tempio della Giungla*)
  - `volcano_lava.jpg` (basalto vulcanico fessurato con venature di magma — Bioma *Regno Vulcanico*)
  - `celestial_marble.jpg` (marmo bianco intarsiato d'oro e cristalli azzurri — Bioma *Città Celeste*)
  - `desert_sandstone.jpg` (arenaria incisa con geroglifici e sabbia dorata — Bioma *Deserto Perduto*)
  - `shadow_obsidian.jpg` (ossidiana nera con venature viola cristalline — Bioma *Regno delle Ombre*)
  - `hero_outfit.jpg` (pelle cucita, cinghie da esploratore e tessuto indaco — *Protagonista*)
  - `malakor_armor.jpg` (piastre d'ossidiana incise con rune magenta e oro fuso — *Malakor*)
  - `bark_wood.jpg` (corteccia d'albero con muschio tropicale e legname — *Alberi, Ponti, Tronchi*)
  - `foliage_canopy.jpg` (chioma fitta di foglie tropicali e felci — *Vegetazione*)
  - `carved_stone.jpg` (pietra templare scolpita con glifi — *Archi, Pilastri, Muri e Ostacoli*)
  - Origine: asset originali generati espressamente per *RELIC RUSH: LOST KINGDOMS* tramite AI image generator. Licenza: **Proprietaria del progetto (Originale)**.
- **Artwork UI (`public/assets/ui/relic_emblem.jpg`)**: Medaglione della Reliquia dell'Eclissi mostrato nel menu principale (`src/ui/MainMenu.tsx`). Origine: asset originale generato per il progetto. Licenza: **Proprietaria del progetto (Originale)**.
- **Cieli Panoramici & Normal Map Procedurali (`src/world/ProceduralTextures.ts`)**: Texture panoramiche 1024×512 con catene montuose e silhouette tematiche per skydome e normal map tangent-space morbide derivate runtime su HTML5 Canvas. Licenza: **Proprietaria del progetto (Originale)**.

## 4. Audio e Musica
- **Sintetizzatore Web Audio API (`src/audio/AudioManager.ts`)**: Tracce musicali dinamiche per menu e biomi ed effetti sonori sintetizzati interamente in tempo reale tramite oscillatori, noise buffer e filtri Biquad Web Audio. Licenza: **Proprietaria del progetto (Originale)**.

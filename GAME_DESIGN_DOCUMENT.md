# GAME DESIGN DOCUMENT — RELIC RUSH: LOST KINGDOMS

## 1. Vision e High Concept
**RELIC RUSH: LOST KINGDOMS** è un endless runner 3D ad alta velocità nello stile *Stylized Realistic Fantasy Adventure*. Dopo aver sottratto l'*Idolo dell'Eclissi* dalle volte sigillate di un tempio antico, l'esploratore risveglia **Malakor, il Guardiano dell'Eclissi**, ed è costretto a fuggire attraverso cinque regni perduti interconnessi, affrontando trappole meccaniche, precipizi, bivi strategici ed eventi cataclismatici.

### Pilastri di Design
1. **Reattività e Leggibilità**: Controlli immediati con input buffering (220ms), corsie chiare e segnalazione visiva anticipata degli ostacoli.
2. **Correttezza Procedurale**: Ogni segmento generato passa attraverso un validatore deterministico (`SolvabilityValidator`) che garantisce percorsi sempre superabili a qualsiasi velocità.
3. **Progressione Profonda**: Livelli giocatore, 6 upgrade permanenti, 6 personaggi personalizzabili, 5 Reliquie da assemblare, 32 Achievement, 15 Sfide dei Regni e 7 modalità di gioco.
4. **Identità Distinta dei Biomi**: Ogni regno cambia geometrie architettoniche, atmosfera, illuminazione, pericoli dedicati e colonna sonora procedurale.

---

## 2. Gameplay e Controlli

### Movimento del Protagonista
- Corsa automatica in avanti con accelerazione progressiva legata alla distanza.
- **3 Corsie** (`-1`, `0`, `+1`, larghezza totale tracciato `6.0m`, spaziatura `2.0m`).
- **Salto** con fisica parabolica reattiva e **Doppio Salto** quando il power-up relativo è attivo.
- **Scivolata** prolungata con riduzione hitbox verticale (e fast-fall se attivata durante un salto).
- **Curve a 90°** (`turn_left`, `turn_right`) e **Bivi a T (`fork_t`)**: nelle zone di svolta l'input laterale ruota il personaggio e la telecamera nel nuovo corridoio invece di spostarlo semplicemente di corsia.

### Mappatura Comandi
| Azione | PC (Tastiera) | Smartphone (Touch / Giroscopio) |
| :--- | :--- | :--- |
| Corsia Sinistra / Svolta Sinistra | `Freccia Sinistra` / `A` | Swipe a Sinistra (o Inclinazione opzionale) |
| Corsia Destra / Svolta Destra | `Freccia Destra` / `D` | Swipe a Destra (o Inclinazione opzionale) |
| Salto / Doppio Salto | `Freccia Su` / `W` / `Spazio` | Swipe in Alto |
| Scivolata / Fast-Fall | `Freccia Giù` / `S` | Swipe in Basso |
| Pausa / Riprendi | `ESC` | Pulsante Pausa HUD |
| Conferma Menu | `Invio` | Tap |

---

## 3. I Cinque Regni (Biomi)

1. **Tempio della Giungla (`jungle`)** — *Sbloccato da subito*
   - *Estetica*: Pietra muschiosa, rovine khmer/maya, alberi animati dal vento, cascate laterali, torce e lucciole.
   - *Ostacoli signature*: Tronchi caduti, archi bassi di pietra, ponti sospesi spezzati, fosse e lame pendolari.
2. **Regno Vulcanico (`volcano`)** — *Sbloccabile a Livello 3 o completando la Sfida del Regno Giungla*
   - *Estetica*: Ossidiana, fiumi di lava incandescente, cenere sospesa, colonne basaltiche spezzate.
   - *Ostacoli signature*: Getti di fuoco temporizzati, rocce vulcaniche incandescenti, piastrelle che crollano.
3. **Città Celeste (`sky`)** — *Sbloccabile a Livello 6 o tramite Sfide del Regno*
   - *Estetica*: Marmo bianco, intarsi d'oro, cristalli d'etere fluttuanti, nuvole stilizzate, archi luminosi.
   - *Ostacoli signature*: Meccanismi rotanti eterei, barriere mobili energetiche, ponti stretti sospesi nel vuoto.
4. **Deserto Perduto (`desert`)** — *Sbloccabile a Livello 9 o tramite Sfide del Regno*
   - *Estetica*: Arenaria dorata, piramidi sullo sfondo, templi sommersi, particelle di sabbia al vento.
   - *Ostacoli signature*: Massi rotolanti delle piramidi, trappole a pressione, colonne crollate.
5. **Regno delle Ombre (`shadow`)** — *Sbloccabile a Livello 12 o tramite Sfide del Regno*
   - *Estetica*: Notte perpetua, rovine ossidiana/ametista, cristalli bioluminescenti viola, nebbia arcana e fuochi fatui.
   - *Ostacoli signature*: Combinazioni serrate di barriere mobili, lame oscure, tunnel stretti e meccanismi rotanti.

Nella modalità standard **Corsa Infinita**, i biomi possono alternarsi dinamicamente ogni `800m` (tra i biomi sbloccati) oppure il giocatore può selezionare un regno specifico.

---

## 4. Nemico Inseguitore: Malakor, il Guardiano dell'Eclissi
- **Sequenza d'Inizio**: All'avvio della corsa Malakor emerge alle spalle del protagonista emettendo un ruggito che avvia l'inseguimento.
- **Sistema di Minaccia Logica (`threatLevel: 0.0 -> 1.0`)**:
  - Corsa pulita: `threatLevel` scende lentamente verso `0.15` (presenza costante ma a distanza di sicurezza).
  - Inciampo (`stumble`) su un ostacolo non letale o impatto parziale: `threatLevel` balza a `0.72`, Malakor si avvicina subito alle spalle dell'esploratore con aura minacciosa e camera shake.
  - Secondo inciampo ravvicinato (prima che `threatLevel` scenda sotto `0.45`): `threatLevel = 1.0`, Malakor cattura il giocatore (`Game Over`).
  - Collisione frontale piena / caduta nel vuoto (senza Scudo o Turbo): Game Over immediato.

---

## 5. Ostacoli e Trappole (15 Tipologie)
1. `fallen_log`: Tronco caduto su una corsia (Salto).
2. `low_wall`: Muro antico basso (Salto).
3. `low_arch`: Architrave basso (Scivolata).
4. `chasm_pit`: Voragine nel tracciato (Salto / cambio corsia se parziale).
5. `broken_bridge`: Ponte danneggiato con assi mancanti (Salto preciso).
6. `collapsed_pillar`: Colonna crollata alta che occupa la corsia (Cambio corsia).
7. `rolling_boulder`: Masso sferico che avanza lungo la corsia (Cambio corsia).
8. `swinging_blade`: Lama pendolare che oscilla trasversalmente (Tempismo / corsia opposta).
9. `pressure_trap`: Pedana a pressione che fa scattare aculei (Cambio corsia o Salto).
10. `fire_jet`: Getto di fiamme periodico dal suolo (Cambio corsia o Salto quando spento).
11. `crumbling_tile`: Lastra instabile che cede sotto i piedi dopo un breve tremolio (Salto o cambio corsia rapido).
12. `volcanic_rock`: Spuntone magmatico ad alto profilo (Cambio corsia).
13. `moving_barrier`: Barriera runica che pattuglia orizzontalmente le 3 corsie.
14. `rotating_mechanism`: Trave rotante antica (Salto al momento giusto o cambio corsia).
15. `narrow_path`: Restringimento improvviso con parapetti distrutti (corsia centrale obbligata).

---

## 6. Collezionabili, Power-Up, Reliquie ed Eventi Dinamici

### Valute e Reliquie
- **Monete d'Oro**: Sparse in archi, linee e curve; valgono `1` (o `2`/`3` con potenziamento `Valore Monete`).
- **Cristalli d'Etere**: Valuta rara ottenuta tramite missioni, achievement, level-up e frammenti speciali.
- **Sistema Reliquie (5 Reliquie × 3 Frammenti)**:
  - *Idolo di Giada* (Giungla): `+10%` Monete raccolte.
  - *Cuore di Ossidiania* (Vulcano): `+15%` Durata Turbo e Scudo.
  - *Astrolabio d'Etere* (Città Celeste): `+15%` XP a fine partita.
  - *Scettro delle Sabbie* (Deserto): `+1` Moltiplicatore punti bonus.
  - *Corona dell'Eclissi* (Ombre): `-15%` Minaccia iniziale del nemico.

### 7 Power-Up
1. **Magnete (`magnet`)**: Attira tutte le monete entro un ampio raggio verso il giocatore.
2. **Scudo (`shield`)**: Assorbe una collisione distruggendo l'ostacolo e respingendo il nemico.
3. **Turbo (`turbo`)**: Scatto ad alta velocità con invulnerabilità agli ostacoli e scia energetica.
4. **Moltiplicatore (`multiplier`)**: Raddoppia (`2x` aggiuntivo) i punti ottenuti durante la durata.
5. **Doppio Salto (`double_jump`)**: Abilita un secondo salto a mezz'aria con impulso extra.
6. **Rallentamento Temporale (`time_slow`)**: Rallenta lo scorrimento del tempo di gioco (`0.68x`) mantenendo la reattività dei comandi.
7. **Bonus Monete (`coin_bonus`)**: Trasforma il valore delle monete raccolte in `3x`.

### 6 Eventi Dinamici
Attivati dinamicamente oltre i `250m` con preavviso HUD e sonoro:
1. **Ponte che Crolla (`collapsing_bridge`)**: Le corsie laterali diventano instabili; il giocatore riceve un bonus sopravvivenza superando la sequenza.
2. **Valanga (`avalanche`)**: Caduta di detriti dall'alto sulle corsie segnalate da cerchi d'ombra/rossi.
3. **Eruzione Vulcanica (`volcanic_eruption`)**: Sfavillio atmosferico intenso, lapilli e aumento dei getti di fuoco.
4. **Tempesta Improvvisa (`sudden_tempest`)**: Vento, pioggia/sabbia fitta e lampi che illuminano la pista.
5. **Fuga dal Tempio in Rovina (`ruined_temple_escape`)**: Tunnel stretto con caduta di colonne laterali e aumento del ritmo.
6. **Inseguimento Intenso (`intense_pursuit`)**: Malakor accelera con musica ad alta tensione per 12 secondi garantendo punti doppi per la sopravvivenza.

---

## 7. Modalità di Gioco (7 Modalità)
1. **Corsa Infinita (`endless`)**: Esperienza classica con transizione tra biomi e progressione completa.
2. **Corsa a Tempo (`time_attack`)**: 90 secondi per ottenere il punteggio massimo possibile.
3. **Sopravvivenza (`survival`)**: Nessun power-up curativo/scudo extra, velocità crescente rapida e ostacoli serrati.
4. **Sfida Pura (`no_powerups`)**: Corsa senza alcun power-up sul tracciato; conta solo l'abilità pura.
5. **Alta Velocità (`hyper_speed`)**: Velocità base incrementata del `+45%` fin dai primi metri.
6. **Pioggia d'Oro (`coin_rush`)**: Quantità tripla di monete lungo tutto il percorso.
7. **Percorso Giornaliero (`daily_seed`)**: Seed fisso basato sulla data corrente (`YYYY-MM-DD`), condivisibile per competere sullo stesso tracciato identico.

---

## 8. Progressione, Economia e Longevità
- **Livello Giocatore (1–50)**: XP calcolata da distanza, punteggio, monete, missioni ed eventuali bonus upgrade/reliquia.
- **6 Potenziamenti Permanenti (5 livelli ciascuno)**: Durata Magnete, Scudo Iniziale/Durata, Valore Monete, Moltiplicatore Punti, Bonus XP, Durata Power-Up.
- **6 Personaggi + Personalizzazione**: *Leo Vance*, *Maya Lin*, *Kaelen*, *Nyx*, *Talos-VII*, *Aethel*, ciascuno personalizzabile con varianti colore abito, accessori ed effetti scia.
- **Missioni**: 3 Giornaliere, 3 Settimanali, catena Permanente e 15 Sfide dei Regni.
- **32 Achievement**: Distribuiti su Distanza, Punteggio, Monete, Abilità, Progressione, Esplorazione e Sfide Speciali.
- **Ricompensa Giornaliera Equa**: Cicli da 7 giorni basati sulle sessioni completate senza penalità o perdita del progresso in caso di assenza.

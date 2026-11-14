import { eventBus } from '../core/EventBus';
import type { BiomeId, GameSettings, GameState } from '../types/game.types';

type LeadTimbre = 'flute' | 'marimba' | 'harp' | 'oud';

interface ThemeDefinition {
  leadTimbre: LeadTimbre;
  padCutoff: number;
  bpmMenu: number;
  bpmRun: number;
  padChords: number[][]; // 4 accordi da 3-4 voci (1 per battuta di 8 step)
  bassNotes: number[]; // 16 o 32 step (0 = pausa)
  arpNotes: number[]; // 16 o 32 step (0 = pausa)
  leadNotes: number[]; // 32 step (0 = pausa)
}

// Frequenze di riferimento (Hz) per accordi e melodie cinematiche
const N = {
  A1: 55.0,
  Bb1: 58.27,
  C2: 65.41,
  D2: 73.42,
  Eb2: 77.78,
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  Ab2: 103.83,
  A2: 110.0,
  Bb2: 116.54,
  B2: 123.47,
  C3: 130.81,
  D3: 146.83,
  Eb3: 155.56,
  E3: 164.81,
  F3: 174.61,
  Fs3: 185.0,
  G3: 196.0,
  Ab3: 207.65,
  A3: 220.0,
  Bb3: 233.08,
  B3: 246.94,
  C4: 261.63,
  Cs4: 277.18,
  D4: 293.66,
  Eb4: 311.13,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392.0,
  Ab4: 415.3,
  A4: 440.0,
  Bb4: 466.16,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  Eb5: 622.25,
  E5: 659.25,
  F5: 698.46,
  Fs5: 739.99,
  G5: 783.99,
  A5: 880.0,
};

const MENU_THEME: ThemeDefinition = {
  leadTimbre: 'flute',
  padCutoff: 780,
  bpmMenu: 84,
  bpmRun: 120,
  padChords: [
    [N.D3, N.A3, N.F4, N.E5], // Dm9 misterioso ed epico
    [N.Bb2, N.F3, N.D4, N.A4], // Bbmaj7 caldo
    [N.F2, N.C3, N.A3, N.E4], // Fmaj7 luminoso
    [N.A2, N.E3, N.D4, N.G4], // Asus4 avventuroso
  ],
  bassNotes: [
    N.D2, 0, 0, 0, N.A2, 0, 0, 0,
    N.Bb1, 0, 0, 0, N.F2, 0, 0, 0,
    N.F2, 0, 0, 0, N.C3, 0, 0, 0,
    N.A1, 0, 0, 0, N.E2, 0, 0, 0,
  ],
  arpNotes: [
    N.D4, 0, N.A4, N.E5, N.F4, 0, N.A4, 0,
    N.D4, 0, N.A4, N.D5, N.F4, 0, N.A4, 0,
    N.C4, 0, N.A4, N.E5, N.F4, 0, N.C5, 0,
    N.E4, 0, N.A4, N.D5, N.A4, 0, N.E4, 0,
  ],
  leadNotes: [
    N.A4, 0, 0, 0, N.D5, 0, N.E5, 0,
    N.F5, 0, 0, 0, N.D5, 0, N.C5, 0,
    N.A4, 0, 0, N.C5, N.D5, 0, 0, 0,
    N.E5, 0, N.D5, 0, N.A4, 0, 0, 0,
  ],
};

const BIOME_THEMES: Record<BiomeId, ThemeDefinition> = {
  jungle: {
    leadTimbre: 'marimba',
    padCutoff: 840,
    bpmMenu: 84,
    bpmRun: 126,
    padChords: [
      [N.D3, N.F3, N.A3, N.E4], // Dm9
      [N.G2, N.D3, N.Bb3, N.F4], // Gm7
      [N.Bb2, N.F3, N.D4, N.A4], // Bbmaj7
      [N.A2, N.E3, N.C4, N.G4], // Am7
    ],
    bassNotes: [
      N.D2, 0, N.D2, 0, N.A2, 0, N.D2, 0,
      N.G2, 0, N.G2, 0, N.D2, 0, N.G2, 0,
      N.Bb1, 0, N.Bb1, 0, N.F2, 0, N.Bb1, 0,
      N.A1, 0, N.A1, 0, N.E2, 0, N.A2, 0,
    ],
    arpNotes: [
      N.D4, N.A4, N.E5, N.A4, N.F4, N.A4, N.D5, N.A4,
      N.G4, N.D5, N.F5, N.D5, N.Bb4, N.D5, N.G4, 0,
      N.F4, N.C5, N.D5, N.A4, N.Bb4, N.F4, N.D5, N.C5,
      N.E4, N.A4, N.C5, N.G4, N.E4, N.A4, N.C5, 0,
    ],
    leadNotes: [
      N.D5, 0, N.F5, 0, N.E5, 0, N.D5, N.C5,
      N.D5, 0, 0, N.A4, N.Bb4, 0, N.G4, 0,
      N.F4, 0, N.A4, 0, N.C5, 0, N.D5, 0,
      N.E5, 0, N.C5, 0, N.A4, 0, 0, 0,
    ],
  },
  volcano: {
    leadTimbre: 'oud',
    padCutoff: 700,
    bpmMenu: 84,
    bpmRun: 136,
    padChords: [
      [N.A2, N.E3, N.A3, N.C4], // Am
      [N.Bb2, N.F3, N.Bb3, N.D4], // Bb (Phrygian tension)
      [N.G2, N.D3, N.G3, N.Bb3], // Gm
      [N.E2, N.B2, N.Ab3, N.E4], // E
    ],
    bassNotes: [
      N.A1, 0, N.A1, N.A1, N.E2, 0, N.A1, 0,
      N.Bb1, 0, N.Bb1, N.Bb1, N.F2, 0, N.Bb1, 0,
      N.G2, 0, N.G2, 0, N.D2, 0, N.G2, 0,
      N.E2, 0, N.E2, N.E2, N.B2, 0, N.E2, 0,
    ],
    arpNotes: [
      N.A3, N.E4, N.A4, N.C5, N.A4, N.E4, N.A3, 0,
      N.Bb3, N.F4, N.Bb4, N.D5, N.Bb4, N.F4, N.Bb3, 0,
      N.G3, N.D4, N.G4, N.Bb4, N.G4, N.D4, N.G3, 0,
      N.Ab3, N.E4, N.B4, N.E5, N.B4, N.Ab4, N.E4, 0,
    ],
    leadNotes: [
      N.E5, 0, N.F5, 0, N.E5, 0, N.D5, 0,
      N.C5, 0, N.Bb4, 0, N.A4, 0, 0, 0,
      N.G4, 0, N.Bb4, 0, N.D5, 0, N.C5, 0,
      N.B4, 0, N.Ab4, 0, N.E4, 0, 0, 0,
    ],
  },
  sky: {
    leadTimbre: 'harp',
    padCutoff: 1050,
    bpmMenu: 82,
    bpmRun: 122,
    padChords: [
      [N.G3, N.B3, N.D4, N.Fs4], // Gmaj7
      [N.E3, N.G3, N.B3, N.Fs4], // Em9
      [N.C3, N.G3, N.B3, N.D4], // Cmaj9
      [N.D3, N.A3, N.E4, N.Fs4], // D6add9
    ],
    bassNotes: [
      N.G2, 0, 0, 0, N.D3, 0, 0, 0,
      N.E2, 0, 0, 0, N.B2, 0, 0, 0,
      N.C2, 0, 0, 0, N.G2, 0, 0, 0,
      N.D2, 0, 0, 0, N.A2, 0, 0, 0,
    ],
    arpNotes: [
      N.G4, N.B4, N.D5, N.Fs5, N.G5, N.Fs5, N.D5, N.B4,
      N.E4, N.G4, N.B4, N.Fs5, N.E5, N.B4, N.G4, 0,
      N.C4, N.E4, N.G4, N.D5, N.B4, N.G4, N.E4, 0,
      N.D4, N.A4, N.D5, N.Fs5, N.E5, N.D5, N.A4, 0,
    ],
    leadNotes: [
      N.B4, 0, 0, N.D5, N.Fs5, 0, N.G5, 0,
      N.Fs5, 0, 0, 0, N.D5, 0, N.B4, 0,
      N.E5, 0, N.D5, 0, N.B4, 0, N.G4, 0,
      N.A4, 0, 0, N.B4, N.D5, 0, 0, 0,
    ],
  },
  desert: {
    leadTimbre: 'oud',
    padCutoff: 760,
    bpmMenu: 84,
    bpmRun: 128,
    padChords: [
      [N.D3, N.Fs3, N.A3, N.D4], // D (Hijaz base)
      [N.Eb3, N.G3, N.Bb3, N.Eb4], // Eb
      [N.C3, N.G3, N.Bb3, N.Eb4], // Cm7
      [N.A2, N.E3, N.A3, N.Cs4], // A7
    ],
    bassNotes: [
      N.D2, 0, N.D2, 0, N.A2, 0, N.D2, 0,
      N.Eb2, 0, N.Eb2, 0, N.Bb2, 0, N.Eb2, 0,
      N.C2, 0, N.C2, 0, N.G2, 0, N.C2, 0,
      N.A1, 0, N.A1, 0, N.E2, 0, N.A2, 0,
    ],
    arpNotes: [
      N.D4, N.Fs4, N.A4, N.Bb4, N.A4, N.Fs4, N.Eb4, N.D4,
      N.Eb4, N.G4, N.Bb4, N.D5, N.Bb4, N.G4, N.Eb4, 0,
      N.C4, N.Eb4, N.G4, N.Bb4, N.G4, N.Eb4, N.C4, 0,
      N.A3, N.Cs4, N.E4, N.G4, N.A4, N.G4, N.E4, 0,
    ],
    leadNotes: [
      N.D5, 0, N.Eb5, 0, N.Fs5, 0, N.G5, 0,
      N.Fs5, 0, N.Eb5, 0, N.D5, 0, N.Bb4, 0,
      N.C5, 0, N.Bb4, 0, N.A4, 0, N.G4, 0,
      N.Fs4, 0, N.Eb4, 0, N.D4, 0, 0, 0,
    ],
  },
  shadow: {
    leadTimbre: 'flute',
    padCutoff: 640,
    bpmMenu: 78,
    bpmRun: 130,
    padChords: [
      [N.C3, N.G3, N.Bb3, N.D4], // Cm9
      [N.Ab2, N.Eb3, N.G3, N.C4], // Abmaj7
      [N.F2, N.C3, N.G3, N.Ab3], // Fm9
      [N.G2, N.D3, N.B3, N.F4], // G7
    ],
    bassNotes: [
      N.C2, 0, 0, N.C2, N.G2, 0, 0, 0,
      N.Ab2, 0, 0, N.Ab2, N.Eb2, 0, 0, 0,
      N.F2, 0, 0, N.F2, N.C3, 0, 0, 0,
      N.G2, 0, 0, N.G2, N.D2, 0, 0, 0,
    ],
    arpNotes: [
      N.C4, N.G4, N.Eb5, N.D5, N.C5, N.G4, N.Bb4, 0,
      N.Ab3, N.Eb4, N.C5, N.G4, N.Eb4, N.Ab4, N.G4, 0,
      N.F3, N.C4, N.Ab4, N.G4, N.F4, N.C4, N.Eb4, 0,
      N.G3, N.D4, N.B4, N.F5, N.D5, N.B4, N.G4, 0,
    ],
    leadNotes: [
      N.G5, 0, 0, N.Eb5, N.D5, 0, N.C5, 0,
      N.Ab4, 0, 0, N.C5, N.Eb5, 0, 0, 0,
      N.F5, 0, N.Eb5, 0, N.D5, 0, N.C5, 0,
      N.B4, 0, 0, N.D5, N.G4, 0, 0, 0,
    ],
  },
};

export class AudioManager {
  private ctx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private reverbSendGain: GainNode | null = null;
  private chorusSendGain: GainNode | null = null;
  private delaySendGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private convolver: ConvolverNode | null = null;
  private warmBrassWave: PeriodicWave | null = null;
  private ethnicReedWave: PeriodicWave | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private schedulerTimer: number | null = null;
  private nextNoteTime = 0;
  private stepIndex = 0;
  private currentBiome: BiomeId = 'jungle';
  private gameState: GameState = 'MENU';
  private intenseMode = false;

  private masterVolume = 0.75;
  private musicVolume = 0.55;
  private sfxVolume = 0.85;
  private muted = false;

  private unsubscribeSfx: (() => void) | null = null;

  constructor() {
    this.unsubscribeSfx = eventBus.on('audio:sfx', ({ sfx, pitch }) => {
      this.playSfx(sfx, pitch);
    });
  }

  public applySettings(settings: GameSettings): void {
    this.masterVolume = settings.masterVolume;
    this.musicVolume = settings.musicVolume;
    this.sfxVolume = settings.sfxVolume;
    this.muted = settings.muted;
    this.syncGains();
  }

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      this.ctx = new AudioCtx();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.01;
      this.compressor.release.value = 0.25;

      this.masterGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.reverbSendGain = this.ctx.createGain();
      this.chorusSendGain = this.ctx.createGain();
      this.delaySendGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      // Riverbero stereo convoluzionale per spazialità orchestrale calda e cinematografica
      this.convolver = this.ctx.createConvolver();
      this.convolver.buffer = this.createReverbImpulse(this.ctx, 1.9, 2.5);

      const reverbFilter = this.ctx.createBiquadFilter();
      reverbFilter.type = 'lowpass';
      reverbFilter.frequency.value = 2800;

      const reverbWet = this.ctx.createGain();
      reverbWet.gain.value = 0.44;

      this.musicGain.connect(this.masterGain);
      this.reverbSendGain.connect(this.convolver);
      this.convolver.connect(reverbFilter);
      reverbFilter.connect(reverbWet);
      reverbWet.connect(this.musicGain);

      // Stereo Chorus Ensemble (L/R ritardi modulati in controfase da LFO lento) per archi/pad larghi
      const chorusDelayL = this.ctx.createDelay(0.1);
      const chorusDelayR = this.ctx.createDelay(0.1);
      chorusDelayL.delayTime.value = 0.017;
      chorusDelayR.delayTime.value = 0.023;
      const chorusLfo = this.ctx.createOscillator();
      chorusLfo.type = 'sine';
      chorusLfo.frequency.value = 0.42;
      const chorusDepthL = this.ctx.createGain();
      const chorusDepthR = this.ctx.createGain();
      chorusDepthL.gain.value = 0.003;
      chorusDepthR.gain.value = -0.003;
      chorusLfo.connect(chorusDepthL);
      chorusLfo.connect(chorusDepthR);
      chorusDepthL.connect(chorusDelayL.delayTime);
      chorusDepthR.connect(chorusDelayR.delayTime);
      chorusLfo.start();

      const chorusMerger = this.ctx.createChannelMerger(2);
      const chorusWet = this.ctx.createGain();
      chorusWet.gain.value = 0.48;
      this.chorusSendGain.connect(chorusDelayL);
      this.chorusSendGain.connect(chorusDelayR);
      chorusDelayL.connect(chorusMerger, 0, 0);
      chorusDelayR.connect(chorusMerger, 0, 1);
      chorusMerger.connect(chorusWet);
      chorusWet.connect(this.musicGain);

      // Stereo Dotted-Eighth Delay con feedback filtrato caldo per Lead e Arpeggi moderni
      const delayNode = this.ctx.createDelay(1.0);
      delayNode.delayTime.value = 0.24;
      const delayFbFilter = this.ctx.createBiquadFilter();
      delayFbFilter.type = 'lowpass';
      delayFbFilter.frequency.value = 1800;
      const delayFbGain = this.ctx.createGain();
      delayFbGain.gain.value = 0.34;
      const delayWet = this.ctx.createGain();
      delayWet.gain.value = 0.36;

      this.delaySendGain.connect(delayNode);
      delayNode.connect(delayFbFilter);
      delayFbFilter.connect(delayFbGain);
      delayFbGain.connect(delayNode);
      delayFbFilter.connect(delayWet);
      delayWet.connect(this.musicGain);
      delayWet.connect(this.reverbSendGain);

      // Forme d'onda wavetable personalizzate (PeriodicWave) per synth cinematografico moderno
      this.warmBrassWave = this.buildCustomWave(this.ctx, [0, 1.0, 0.58, 0.38, 0.24, 0.16, 0.09, 0.05]);
      this.ethnicReedWave = this.buildCustomWave(this.ctx, [0, 1.0, 0.22, 0.65, 0.14, 0.36, 0.08, 0.16]);

      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.noiseBuffer = this.createNoiseBuffer(this.ctx);
      this.nextNoteTime = this.ctx.currentTime + 0.06;
      this.syncGains();
      this.startLookaheadScheduler();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().then(() => {
        if (this.ctx) {
          this.nextNoteTime = Math.max(this.nextNoteTime, this.ctx.currentTime + 0.04);
        }
      });
    }
  }

  public setContextState(state: GameState, biome: BiomeId, intense: boolean): void {
    this.gameState = state;
    this.currentBiome = biome;
    this.intenseMode = intense;
  }

  private syncGains(): void {
    if (!this.ctx || !this.masterGain || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const effectiveMaster = this.muted ? 0 : this.masterVolume;
    this.masterGain.gain.setTargetAtTime(effectiveMaster, now, 0.03);
    this.musicGain.gain.setTargetAtTime(this.musicVolume * 0.52, now, 0.06);
    this.sfxGain.gain.setTargetAtTime(this.sfxVolume * 0.72, now, 0.03);
    if (this.reverbSendGain) {
      this.reverbSendGain.gain.setTargetAtTime(1.0, now, 0.05);
    }
  }

  private buildCustomWave(ctx: AudioContext, harmonics: number[]): PeriodicWave {
    const real = new Float32Array(harmonics.length);
    const imag = new Float32Array(harmonics.length);
    for (let i = 1; i < harmonics.length; i++) {
      imag[i] = harmonics[i];
    }
    return ctx.createPeriodicWave(real, imag, { disableNormalization: false });
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 1.2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private createReverbImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * seconds);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        const t = i / length;
        const env = Math.pow(1 - t, decay) * Math.min(1, i / (ctx.sampleRate * 0.025));
        data[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return impulse;
  }

  private startLookaheadScheduler(): void {
    if (this.schedulerTimer !== null || typeof window === 'undefined') return;
    const schedule = () => {
      if (this.ctx && this.ctx.state === 'running') {
        const lookahead = 0.14;
        if (this.nextNoteTime < this.ctx.currentTime - 0.3) {
          this.nextNoteTime = this.ctx.currentTime + 0.04;
        }
        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
          if (!this.muted && this.musicVolume > 0.01) {
            this.scheduleMusicStep(this.nextNoteTime, this.stepIndex);
          }
          const isRunning = this.gameState === 'PLAYING' || this.gameState === 'TUTORIAL';
          const theme = isRunning ? BIOME_THEMES[this.currentBiome] : MENU_THEME;
          const bpm = isRunning
            ? theme.bpmRun + (this.intenseMode ? 12 : 0)
            : theme.bpmMenu;
          // 1 step = croma (ottavo) = 60 / bpm / 2 secondi
          const stepDur = 60 / bpm / 2;
          this.nextNoteTime += stepDur;
          this.stepIndex = (this.stepIndex + 1) % 32;
        }
      }
      this.schedulerTimer = window.setTimeout(schedule, 35);
    };
    this.schedulerTimer = window.setTimeout(schedule, 50);
  }

  private scheduleMusicStep(time: number, step: number): void {
    if (!this.ctx || !this.musicGain || !this.reverbSendGain) return;
    if (this.gameState === 'PAUSED' || this.gameState === 'GAME_OVER') return;

    const isRunning = this.gameState === 'PLAYING' || this.gameState === 'TUTORIAL';
    const theme = isRunning ? BIOME_THEMES[this.currentBiome] : MENU_THEME;
    const stepDur = 60 / (isRunning ? theme.bpmRun : theme.bpmMenu) / 2;

    // 1. Traccia Pad Orchestrale / Archi Caldi: un accordo a 4 voci ogni 8 step (1 battuta)
    if (step % 8 === 0) {
      const chordIdx = Math.floor(step / 8) % theme.padChords.length;
      const chord = theme.padChords[chordIdx];
      this.playWarmPadChord(chord, time, stepDur * 8.4, theme.padCutoff, isRunning ? 0.11 : 0.13);
    }

    // 2. Traccia Basso Caldo Profondo
    const bassFreq = theme.bassNotes[step % theme.bassNotes.length];
    if (bassFreq > 0) {
      this.playWarmBass(bassFreq, time, stepDur * 1.45, isRunning ? 0.2 : 0.14);
    }

    // 3. Traccia Arpeggiatore (Arpa / Pizzicato)
    const arpFreq = theme.arpNotes[step % theme.arpNotes.length];
    if (arpFreq > 0) {
      this.playHarpArp(arpFreq, time, stepDur * 1.5, isRunning ? 0.085 : 0.075);
    }

    // 4. Traccia Melodia Solista (Flauto Antico / Marimba / Arpa / Oud)
    const leadFreq = theme.leadNotes[step % theme.leadNotes.length];
    if (leadFreq > 0) {
      this.playLeadVoice(
        leadFreq,
        time,
        stepDur * 2.1,
        theme.leadTimbre,
        isRunning ? 0.15 : 0.13
      );
    }

    // 5. Percussioni Cinematiche Moderne Stratificate durante la corsa (soffuse nel menu)
    if (isRunning) {
      if (step % 8 === 0 || step % 8 === 3 || (this.intenseMode && step % 8 === 6)) {
        this.triggerTaikoKick(time, step % 8 === 0 ? 0.36 : 0.25);
      }
      if (step % 8 === 2 || step % 8 === 6) {
        this.triggerModernSnareClap(time, this.intenseMode ? 0.18 : 0.14);
      }
      if (step % 8 === 5 || step % 8 === 7) {
        this.triggerTribalTom(time, step % 16 < 8 ? 148 : 118, 0.14);
      }
      if (step % 2 === 1) {
        this.triggerShaker(time, this.intenseMode ? 0.06 : 0.036);
      }
      if (this.intenseMode && (step % 8 === 0 || step % 8 === 2)) {
        this.triggerHeartbeatPulse(time, 0.24);
      }
    } else if (step % 8 === 0) {
      this.triggerTaikoKick(time, 0.12);
    }
  }

  private playWarmPadChord(
    freqs: number[],
    startTime: number,
    duration: number,
    cutoff: number,
    volume: number
  ): void {
    if (!this.ctx || !this.musicGain || !this.reverbSendGain) return;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff * 0.7, startTime);
    filter.frequency.linearRampToValueAtTime(cutoff, startTime + duration * 0.35);
    filter.frequency.linearRampToValueAtTime(cutoff * 0.65, startTime + duration);

    const chordGain = this.ctx.createGain();
    chordGain.gain.setValueAtTime(0.0001, startTime);
    chordGain.gain.linearRampToValueAtTime(volume, startTime + Math.min(0.45, duration * 0.28));
    chordGain.gain.setValueAtTime(volume * 0.85, startTime + duration * 0.68);
    chordGain.gain.exponentialRampToValueAtTime(0.0005, startTime + duration);

    filter.connect(chordGain);
    chordGain.connect(this.musicGain);
    chordGain.connect(this.reverbSendGain);
    if (this.chorusSendGain) {
      chordGain.connect(this.chorusSendGain);
    }

    const perVoiceScale = 1 / Math.max(1, Math.sqrt(freqs.length));
    for (const freq of freqs) {
      const oscA = this.ctx.createOscillator();
      const oscB = this.ctx.createOscillator();
      const vGain = this.ctx.createGain();
      vGain.gain.value = perVoiceScale * 0.52;

      if (this.warmBrassWave) {
        oscA.setPeriodicWave(this.warmBrassWave);
      } else {
        oscA.type = 'sawtooth';
      }
      oscA.frequency.setValueAtTime(freq, startTime);
      oscA.detune.setValueAtTime(-7, startTime);

      oscB.type = 'triangle';
      oscB.frequency.setValueAtTime(freq, startTime);
      oscB.detune.setValueAtTime(7, startTime);

      oscA.connect(vGain);
      oscB.connect(vGain);
      vGain.connect(filter);

      oscA.start(startTime);
      oscB.start(startTime);
      oscA.stop(startTime + duration + 0.04);
      oscB.stop(startTime + duration + 0.04);
    }
  }

  private playLeadVoice(
    freq: number,
    startTime: number,
    duration: number,
    timbre: LeadTimbre,
    volume: number
  ): void {
    if (!this.ctx || !this.musicGain || !this.reverbSendGain) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const g1 = this.ctx.createGain();
    const g2 = this.ctx.createGain();

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';

    const env = this.ctx.createGain();
    const endTime = startTime + duration;

    if (timbre === 'flute') {
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 2, startTime);
      g1.gain.value = 0.85;
      g2.gain.value = 0.12;
      filter.frequency.setValueAtTime(2100, startTime);

      // Vibrato leggero dopo l'attacco per effetto flauto espressivo
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 5.2;
      lfoGain.gain.setValueAtTime(0, startTime);
      lfoGain.gain.linearRampToValueAtTime(3.6, startTime + 0.18);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfo.start(startTime);
      lfo.stop(endTime + 0.03);

      env.gain.setValueAtTime(0.0001, startTime);
      env.gain.linearRampToValueAtTime(volume, startTime + 0.08);
      env.gain.setValueAtTime(volume * 0.82, endTime - 0.14);
      env.gain.exponentialRampToValueAtTime(0.0005, endTime);
    } else if (timbre === 'marimba') {
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 4, startTime);
      g1.gain.value = 0.9;
      g2.gain.setValueAtTime(0.28, startTime);
      g2.gain.exponentialRampToValueAtTime(0.01, startTime + 0.08);
      filter.frequency.setValueAtTime(2400, startTime);

      env.gain.setValueAtTime(0.0001, startTime);
      env.gain.linearRampToValueAtTime(volume * 1.15, startTime + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0008, endTime * 0.85 + startTime * 0.15);
    } else if (timbre === 'harp') {
      osc1.type = 'triangle';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 2, startTime);
      g1.gain.value = 0.72;
      g2.gain.value = 0.25;
      filter.frequency.setValueAtTime(3000, startTime);
      filter.frequency.exponentialRampToValueAtTime(900, endTime);

      env.gain.setValueAtTime(0.0001, startTime);
      env.gain.linearRampToValueAtTime(volume, startTime + 0.014);
      env.gain.exponentialRampToValueAtTime(0.0005, endTime);
    } else {
      // 'oud': timbro wavetable ricco etnico-epico moderno con sub-armonica
      if (this.ethnicReedWave) {
        osc1.setPeriodicWave(this.ethnicReedWave);
      } else {
        osc1.type = 'sawtooth';
      }
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, startTime);
      osc2.frequency.setValueAtTime(freq * 0.5, startTime);
      g1.gain.value = 0.52;
      g2.gain.value = 0.48;
      filter.frequency.setValueAtTime(2400, startTime);
      filter.frequency.exponentialRampToValueAtTime(680, endTime);

      env.gain.setValueAtTime(0.0001, startTime);
      env.gain.linearRampToValueAtTime(volume, startTime + 0.015);
      env.gain.exponentialRampToValueAtTime(0.0006, endTime);
    }

    osc1.connect(g1);
    osc2.connect(g2);
    g1.connect(filter);
    g2.connect(filter);
    filter.connect(env);
    env.connect(this.musicGain);
    env.connect(this.reverbSendGain);
    if (this.delaySendGain) {
      env.connect(this.delaySendGain);
    }

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(endTime + 0.04);
    osc2.stop(endTime + 0.04);
  }

  private playHarpArp(
    freq: number,
    startTime: number,
    duration: number,
    volume: number
  ): void {
    if (!this.ctx || !this.musicGain || !this.reverbSendGain) return;
    const osc = this.ctx.createOscillator();
    if (this.warmBrassWave) {
      osc.setPeriodicWave(this.warmBrassWave);
    } else {
      osc.type = 'triangle';
    }
    osc.frequency.setValueAtTime(freq, startTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, startTime);
    filter.frequency.exponentialRampToValueAtTime(580, startTime + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0005, startTime + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    gain.connect(this.reverbSendGain);
    if (this.delaySendGain) {
      gain.connect(this.delaySendGain);
    }

    osc.start(startTime);
    osc.stop(startTime + duration + 0.03);
  }

  private playWarmBass(
    freq: number,
    startTime: number,
    duration: number,
    volume: number
  ): void {
    if (!this.ctx || !this.musicGain) return;
    const sub = this.ctx.createOscillator();
    const body = this.ctx.createOscillator();
    sub.type = 'sine';
    body.type = 'triangle';
    sub.frequency.setValueAtTime(freq, startTime);
    body.frequency.setValueAtTime(freq * 2, startTime);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, startTime);
    filter.frequency.exponentialRampToValueAtTime(110, startTime + duration);

    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.78;
    const bodyGain = this.ctx.createGain();
    bodyGain.gain.value = 0.28;

    const env = this.ctx.createGain();
    env.gain.setValueAtTime(0.0001, startTime);
    env.gain.linearRampToValueAtTime(volume, startTime + 0.025);
    env.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    sub.connect(subGain);
    body.connect(bodyGain);
    subGain.connect(env);
    bodyGain.connect(filter);
    filter.connect(env);
    env.connect(this.musicGain);

    sub.start(startTime);
    body.start(startTime);
    sub.stop(startTime + duration + 0.03);
    body.stop(startTime + duration + 0.03);
  }

  private triggerTaikoKick(startTime: number, volume: number): void {
    if (!this.ctx || !this.musicGain || !this.reverbSendGain) return;
    const subOsc = this.ctx.createOscillator();
    const punchOsc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const punchGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(118, startTime);
    subOsc.frequency.exponentialRampToValueAtTime(42, startTime + 0.19);

    punchOsc.type = 'triangle';
    punchOsc.frequency.setValueAtTime(220, startTime);
    punchOsc.frequency.exponentialRampToValueAtTime(75, startTime + 0.055);
    punchGain.gain.setValueAtTime(0.45, startTime);
    punchGain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.06);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.007);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.24);

    const revTap = this.ctx.createGain();
    revTap.gain.value = 0.24;

    subOsc.connect(gain);
    punchOsc.connect(punchGain);
    punchGain.connect(gain);
    gain.connect(this.musicGain);
    gain.connect(revTap);
    revTap.connect(this.reverbSendGain);
    subOsc.start(startTime);
    punchOsc.start(startTime);
    subOsc.stop(startTime + 0.25);
    punchOsc.stop(startTime + 0.08);
  }

  private triggerModernSnareClap(startTime: number, volume: number): void {
    if (!this.ctx || !this.musicGain || !this.reverbSendGain || !this.noiseBuffer) return;

    // 1. Corpo tonale (snare body)
    const bodyOsc = this.ctx.createOscillator();
    const bodyGain = this.ctx.createGain();
    bodyOsc.type = 'triangle';
    bodyOsc.frequency.setValueAtTime(215, startTime);
    bodyOsc.frequency.exponentialRampToValueAtTime(135, startTime + 0.09);
    bodyGain.gain.setValueAtTime(volume * 0.6, startTime);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.11);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(this.musicGain);
    bodyOsc.start(startTime);
    bodyOsc.stop(startTime + 0.12);

    // 2. Clap/Snare riverberato (noise bandpass 1.8 kHz)
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = this.noiseBuffer;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1850;
    bp.Q.value = 1.1;
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.0001, startTime);
    nGain.gain.linearRampToValueAtTime(volume, startTime + 0.008);
    nGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.19);

    const revTap = this.ctx.createGain();
    revTap.gain.value = 0.45;
    noiseSrc.connect(bp);
    bp.connect(nGain);
    nGain.connect(this.musicGain);
    nGain.connect(revTap);
    revTap.connect(this.reverbSendGain);
    noiseSrc.start(startTime);
    noiseSrc.stop(startTime + 0.21);
  }

  private triggerTribalTom(startTime: number, baseFreq: number, volume: number): void {
    if (!this.ctx || !this.musicGain || !this.reverbSendGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq * 1.25, startTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq, startTime + 0.12);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.15);

    const revTap = this.ctx.createGain();
    revTap.gain.value = 0.35;

    osc.connect(gain);
    gain.connect(this.musicGain);
    gain.connect(revTap);
    revTap.connect(this.reverbSendGain);
    osc.start(startTime);
    osc.stop(startTime + 0.17);
  }

  private triggerShaker(startTime: number, volume: number): void {
    if (!this.ctx || !this.musicGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4200;
    filter.Q.value = 2.4;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.065);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start(startTime);
    src.stop(startTime + 0.075);
  }

  private triggerHeartbeatPulse(startTime: number, volume: number): void {
    if (!this.ctx || !this.musicGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(72, startTime);
    osc.frequency.exponentialRampToValueAtTime(36, startTime + 0.14);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + 0.16);

    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(startTime);
    osc.stop(startTime + 0.18);
  }

  public playSfx(
    sfx:
      | 'footstep'
      | 'jump'
      | 'double_jump'
      | 'slide'
      | 'turn'
      | 'coin'
      | 'crystal'
      | 'relic'
      | 'powerup'
      | 'shield_break'
      | 'near_miss'
      | 'stumble'
      | 'crash'
      | 'enemy_roar'
      | 'achievement'
      | 'level_up'
      | 'ui_click'
      | 'event_warning',
    pitch: number = 1
  ): void {
    if (!this.ctx || !this.sfxGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    switch (sfx) {
      case 'footstep':
        this.triggerNoiseBurst(now, 0.04, 480, 0.09);
        break;
      case 'jump':
        this.triggerSweep(now, 240, 560, 0.16, 'sine', 0.24);
        break;
      case 'double_jump':
        this.triggerSweep(now, 360, 820, 0.19, 'triangle', 0.26);
        break;
      case 'slide':
        this.triggerNoiseBurst(now, 0.22, 1000, 0.18);
        break;
      case 'turn':
        this.triggerSweep(now, 190, 350, 0.12, 'triangle', 0.2);
        break;
      case 'coin': {
        const pentatonic = [1.0, 1.122, 1.26, 1.498, 1.682, 2.0, 2.245, 2.52];
        const idx = (Math.max(1, Math.round(pitch)) - 1) % pentatonic.length;
        const mult = pentatonic[idx];
        this.triggerTone(659.25 * mult, now, 0.085, 'sine', 0.19, this.sfxGain);
        this.triggerTone(987.77 * mult, now + 0.035, 0.12, 'triangle', 0.16, this.sfxGain);
        this.triggerTone(1318.5 * mult, now + 0.06, 0.11, 'sine', 0.09, this.sfxGain);
        break;
      }
      case 'near_miss':
        this.triggerSweep(now, 420, 1180, 0.14, 'triangle', 0.22);
        this.triggerTone(587.33, now + 0.03, 0.14, 'sine', 0.18, this.sfxGain);
        this.triggerTone(880.0, now + 0.07, 0.18, 'sine', 0.18, this.sfxGain);
        this.triggerTone(1174.66, now + 0.11, 0.22, 'triangle', 0.16, this.sfxGain);
        break;
      case 'crystal':
      case 'relic':
        this.triggerTone(784, now, 0.16, 'triangle', 0.22, this.sfxGain);
        this.triggerTone(1046, now + 0.08, 0.18, 'triangle', 0.22, this.sfxGain);
        this.triggerTone(1568, now + 0.16, 0.28, 'sine', 0.22, this.sfxGain);
        break;
      case 'powerup':
        this.triggerSweep(now, 320, 960, 0.26, 'triangle', 0.2);
        break;
      case 'shield_break':
        this.triggerNoiseBurst(now, 0.28, 1600, 0.3);
        this.triggerSweep(now, 580, 140, 0.28, 'triangle', 0.24);
        break;
      case 'stumble':
        this.triggerSweep(now, 220, 90, 0.22, 'sawtooth', 0.24);
        break;
      case 'crash':
        this.triggerNoiseBurst(now, 0.42, 420, 0.38);
        this.triggerSweep(now, 160, 48, 0.42, 'sawtooth', 0.3);
        break;
      case 'enemy_roar':
        this.triggerSweep(now, 125, 62, 0.48, 'sawtooth', 0.24);
        this.triggerNoiseBurst(now, 0.42, 320, 0.2);
        break;
      case 'achievement':
      case 'level_up':
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          this.triggerTone(freq, now + i * 0.08, 0.24, 'triangle', 0.22, this.sfxGain!);
        });
        break;
      case 'ui_click':
        this.triggerTone(620, now, 0.045, 'sine', 0.12, this.sfxGain);
        break;
      case 'event_warning':
        this.triggerTone(440, now, 0.16, 'triangle', 0.16, this.sfxGain);
        this.triggerTone(349, now + 0.18, 0.22, 'triangle', 0.16, this.sfxGain);
        break;
    }
  }

  private triggerTone(
    freq: number,
    startTime: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    dest: AudioNode
  ): void {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private triggerSweep(
    startTime: number,
    fromFreq: number,
    toFreq: number,
    duration: number,
    type: OscillatorType,
    volume: number
  ): void {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fromFreq, startTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, toFreq), startTime + duration);

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private triggerNoiseBurst(
    startTime: number,
    duration: number,
    cutoff: number,
    volume: number
  ): void {
    if (!this.ctx || !this.sfxGain || !this.noiseBuffer) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = cutoff;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(startTime);
    src.stop(startTime + duration + 0.02);
  }

  public dispose(): void {
    if (this.schedulerTimer !== null) {
      window.clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    this.unsubscribeSfx?.();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}

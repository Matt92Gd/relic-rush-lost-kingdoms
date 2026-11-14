import { Engine, Scene, DefaultRenderingPipeline } from '@babylonjs/core';
import { eventBus } from '../core/EventBus';
import type { PerformanceMetrics, QualityPreset } from '../types/game.types';

export class PerformanceManager {
  private preset: QualityPreset = 'high';
  private renderScale = 1.0;
  private sampleTimer = 0;
  private frameCounter = 0;
  private lastMetrics: PerformanceMetrics = {
    fps: 60,
    frameTimeMs: 16.7,
    activeSegments: 0,
    pooledSegments: 0,
    activeMeshes: 0,
    renderScale: 1,
    qualityPreset: 'high',
  };

  constructor(
    private readonly engine: Engine,
    private readonly scene: Scene,
    private readonly pipeline: DefaultRenderingPipeline | null
  ) {}

  public applyPreset(preset: QualityPreset): void {
    this.preset = preset;
    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;

    if (preset === 'low') {
      this.renderScale = 1.0;
      if (this.pipeline) {
        this.pipeline.bloomEnabled = false;
        this.pipeline.fxaaEnabled = true;
        this.pipeline.sharpenEnabled = true;
        this.pipeline.sharpen.edgeAmount = 0.22;
        this.pipeline.samples = 1;
      }
    } else if (preset === 'medium') {
      this.renderScale = Number((1 / Math.min(dpr, 1.25)).toFixed(2));
      if (this.pipeline) {
        this.pipeline.bloomEnabled = true;
        this.pipeline.bloomWeight = 0.18;
        this.pipeline.fxaaEnabled = true;
        this.pipeline.sharpenEnabled = true;
        this.pipeline.sharpen.edgeAmount = 0.26;
        this.pipeline.samples = 1;
      }
    } else if (preset === 'high') {
      this.renderScale = Number((1 / Math.min(dpr, 1.5)).toFixed(2));
      if (this.pipeline) {
        this.pipeline.bloomEnabled = true;
        this.pipeline.bloomWeight = 0.22;
        this.pipeline.fxaaEnabled = true;
        this.pipeline.sharpenEnabled = true;
        this.pipeline.sharpen.edgeAmount = 0.3;
        this.pipeline.samples = 2;
      }
    } else {
      // ultra
      this.renderScale = Number((1 / dpr).toFixed(2));
      if (this.pipeline) {
        this.pipeline.bloomEnabled = true;
        this.pipeline.bloomWeight = 0.26;
        this.pipeline.fxaaEnabled = true;
        this.pipeline.sharpenEnabled = true;
        this.pipeline.sharpen.edgeAmount = 0.34;
        this.pipeline.samples = 4;
      }
    }
    this.engine.setHardwareScalingLevel(this.renderScale);
    this.engine.resize();
  }

  public sample(dt: number, activeSegments: number, pooledSegments: number): void {
    this.sampleTimer += dt;
    this.frameCounter += 1;

    if (this.sampleTimer >= 0.5) {
      const fps = Math.round(this.frameCounter / this.sampleTimer);
      const frameTimeMs = Number(((this.sampleTimer * 1000) / Math.max(1, this.frameCounter)).toFixed(1));

      this.lastMetrics = {
        fps,
        frameTimeMs,
        activeSegments,
        pooledSegments,
        activeMeshes: this.scene.meshes.length,
        renderScale: Number((1 / this.renderScale).toFixed(2)),
        qualityPreset: this.preset,
      };

      eventBus.emit('performance:updated', this.lastMetrics);
      this.sampleTimer = 0;
      this.frameCounter = 0;
    }
  }

  public getMetrics(): PerformanceMetrics {
    return this.lastMetrics;
  }
}

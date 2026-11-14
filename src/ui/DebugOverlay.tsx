import React from 'react';
import type { PerformanceMetrics, RunTelemetry } from '../types/game.types';

interface DebugOverlayProps {
  metrics: PerformanceMetrics;
  telemetry: RunTelemetry;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ metrics, telemetry }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 122,
        right: 12,
        background: 'rgba(2, 6, 23, 0.86)',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        borderRadius: 10,
        padding: '8px 12px',
        fontSize: '0.72rem',
        fontFamily: 'monospace',
        color: '#bae6fd',
        zIndex: 55,
        pointerEvents: 'none',
        lineHeight: 1.45,
      }}
    >
      <div>FPS: <strong>{metrics.fps}</strong> ({metrics.frameTimeMs} ms)</div>
      <div>Preset: {metrics.qualityPreset} | Scale: {metrics.renderScale}x</div>
      <div>Segmenti: {metrics.activeSegments} attivi / {metrics.pooledSegments} riciclati</div>
      <div>Mesh Scena: {metrics.activeMeshes}</div>
      <div>Bioma: {telemetry.currentBiome} | Vel: {telemetry.speed.toFixed(1)} m/s</div>
      <div>Seed: {telemetry.seed}</div>
    </div>
  );
};

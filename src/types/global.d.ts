declare module 'n8ao' {
  import type { Camera, Scene } from 'three';
  import type { Pass } from 'postprocessing';
  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: {
      aoRadius: number;
      distanceFalloff: number;
      intensity: number;
      halfRes: boolean;
      aoSamples: number;
      denoiseSamples: number;
      denoiseRadius: number;
      color: import('three').Color;
      gammaCorrection: boolean;
      screenSpaceRadius: boolean;
    };
    setQualityMode(mode: 'Performance' | 'Low' | 'Medium' | 'High' | 'Ultra'): void;
    setSize(width: number, height: number): void;
  }
}

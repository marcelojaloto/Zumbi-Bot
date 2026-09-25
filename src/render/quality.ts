export type QualityLevel = 'low' | 'medium' | 'high';
export type QualitySetting = QualityLevel | 'auto';

export interface QualityPreset {
  level: QualityLevel;
  pixelRatioCap: number;
  renderScale: number;
  shadows: boolean;
  shadowMapSize: number;
  softShadows: boolean;
  shadowEveryOther: boolean;
  pointLights: number;
  post: boolean;
  ssao: boolean;
  chromatic: boolean;
  bloomLevels: number;
  smaa: boolean;
  standardMaterials: boolean;
  particles: number;
  decals: number;
  corpses: number;
  propDensity: number;
  envParticles: number;
  enemyCap: number;
  textureSize: number;
}

export const QUALITY: Record<QualityLevel, QualityPreset> = {
  low: {
    level: 'low',
    pixelRatioCap: 1,
    renderScale: 0.85,
    shadows: false,
    shadowMapSize: 512,
    softShadows: false,
    shadowEveryOther: true,
    pointLights: 2,
    post: false,
    ssao: false,
    chromatic: false,
    bloomLevels: 3,
    smaa: false,
    standardMaterials: false,
    particles: 300,
    decals: 5,
    corpses: 4,
    propDensity: 0.5,
    envParticles: 0.3,
    enemyCap: 10,
    textureSize: 128,
  },
  medium: {
    level: 'medium',
    pixelRatioCap: 1.5,
    renderScale: 1,
    shadows: true,
    shadowMapSize: 1024,
    softShadows: false,
    shadowEveryOther: true,
    pointLights: 4,
    post: true,
    ssao: false,
    chromatic: false,
    bloomLevels: 4,
    smaa: true,
    standardMaterials: true,
    particles: 800,
    decals: 15,
    corpses: 10,
    propDensity: 0.8,
    envParticles: 0.7,
    enemyCap: 14,
    textureSize: 256,
  },
  high: {
    level: 'high',
    pixelRatioCap: 2,
    renderScale: 1,
    shadows: true,
    shadowMapSize: 2048,
    softShadows: true,
    shadowEveryOther: false,
    pointLights: 8,
    post: true,
    ssao: true,
    chromatic: true,
    bloomLevels: 5,
    smaa: true,
    standardMaterials: true,
    particles: 2000,
    decals: 40,
    corpses: 20,
    propDensity: 1,
    envParticles: 1,
    enemyCap: 16,
    textureSize: 256,
  },
};

/** "Automática" começa na Média (Baixa em celulares); a queda por desempenho continua valendo. */
export function resolveQuality(
  q: QualitySetting,
  device: 'phone' | 'tablet' | 'desktop' = 'desktop',
): QualityLevel {
  if (q !== 'auto') return q;
  return device === 'phone' ? 'low' : 'medium';
}

export function downgrade(q: QualityLevel): QualityLevel {
  return q === 'high' ? 'medium' : 'low';
}

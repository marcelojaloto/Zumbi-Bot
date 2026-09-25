/** Flags de URL para depuração e testes automatizados. */
export interface UrlFlags {
  debug: boolean;
  map: string | null;
  level: number;
  autostart: boolean;
  quality: 'low' | 'medium' | 'high' | 'auto' | null;
  seed: number | null;
  mute: boolean;
  god: boolean;
  nopointerlock: boolean;
  autopilot: boolean;
  fps: boolean;
}

export function readFlags(search = location.search): UrlFlags {
  const q = new URLSearchParams(search);
  const b = (k: string) => q.has(k) && q.get(k) !== '0' && q.get(k) !== 'false';
  const quality = q.get('quality');
  return {
    debug: b('debug'),
    map: q.get('map'),
    level: Number(q.get('level') ?? 0) || 0,
    autostart: b('autostart'),
    quality:
      quality === 'low' || quality === 'medium' || quality === 'high' || quality === 'auto' ? quality : null,
    seed: q.has('seed') ? Number(q.get('seed')) : null,
    mute: b('mute'),
    god: b('god'),
    nopointerlock: b('nopointerlock'),
    autopilot: b('autopilot'),
    fps: b('fps'),
  };
}

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
  /** Personagem do jogador 1 (ex.: ?char=mage). */
  char: string | null;
  /** Equipe local (ex.: ?party=robot,mage,mutant). */
  party: string[];
  /** Conexão online: 'local' = abas do mesmo navegador (testes); padrão PeerJS. */
  net: 'peer' | 'local';
  /** Link de sala (?sala=ABCD): abre a tela de entrar com o código. */
  sala: string | null;
  /** Outro servidor PeerJS (?peer=host:porta/caminho) — testes ou servidor próprio. */
  peer: string | null;
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
    char: q.get('char'),
    party: (q.get('party') ?? '').split(',').filter(Boolean).slice(0, 5),
    net: q.get('net') === 'local' ? 'local' : 'peer',
    sala: q.get('sala'),
    peer: q.get('peer'),
  };
}

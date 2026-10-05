/**
 * Mensagens grandes em pedaços. O canal JSON do PeerJS recusa (sem enviar e sem fechar a conexão) mensagens de
 * 16300 bytes ou mais, e entre navegadores diferentes nem é seguro passar de 16 KB. O estado completo do mundo
 * com 3 ou mais jogadores e uma onda de inimigos passa disso: ele vai em pedaços menores e é montado de novo do
 * outro lado, na ordem (a conexão é confiável e ordenada, e os pedaços saem todos juntos).
 */

/** Maior mensagem enviada de uma vez (bytes em UTF-8, já como JSON). */
export const MAX_FRAME_BYTES = 16000;
/** Tamanho de cada pedaço (caracteres do JSON da mensagem original). */
const PIECE_CHARS = 4000;

/** Pedaço de uma mensagem grande; `end` marca o último. */
interface Piece {
  t: '~part';
  d: string;
  end: boolean;
}

function isPiece(m: unknown): m is Piece {
  return !!m && typeof m === 'object' && (m as Piece).t === '~part' && typeof (m as Piece).d === 'string';
}

/** Tamanho em UTF-8 de um texto (sem criar o array de bytes). */
export function utf8Bytes(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < s.length) {
      // par substituto: um caractere de 4 bytes
      n += 4;
      i++;
    } else n += 3;
  }
  return n;
}

function pieceFits(p: Piece, max: number): boolean {
  return utf8Bytes(JSON.stringify(p)) < max;
}

/** Corta o texto em pedaços que cabem no limite (sem separar um par substituto). */
function cut(s: string, max: number, out: Piece[]): void {
  let i = 0;
  while (i < s.length) {
    let len = Math.min(PIECE_CHARS, s.length - i);
    for (;;) {
      let j = i + len;
      if (j < s.length && (s.charCodeAt(j - 1) & 0xfc00) === 0xd800) j--;
      const p: Piece = { t: '~part', d: s.slice(i, j), end: j >= s.length };
      // texto cheio de aspas ou acentos ocupa mais no JSON: diminui o pedaço até caber
      if (pieceFits(p, max) || len <= 16) {
        out.push(p);
        i = j;
        break;
      }
      len = Math.floor(len / 2);
    }
  }
}

/**
 * O que enviar no lugar de `msg`: ela mesma, se couber, ou os pedaços. `json` é o JSON da mensagem, quando já foi
 * feito (a mesma mensagem para vários jogadores vira texto uma vez só).
 */
export function splitMessage(msg: unknown, max = MAX_FRAME_BYTES, json?: string): unknown[] {
  const s = json ?? JSON.stringify(msg);
  if (s === undefined) return [msg];
  // até um terço do limite em caracteres sempre cabe (3 bytes por caractere no pior caso)
  if (s.length * 3 < max || utf8Bytes(s) < max) return [msg];
  const out: Piece[] = [];
  cut(s, max, out);
  return out;
}

/** Monta as mensagens que chegaram em pedaços; as outras passam direto. */
export class Joiner {
  private parts: string[] = [];

  /** Mensagem completa, ou `undefined` enquanto faltam pedaços. */
  take(m: unknown): unknown {
    if (!isPiece(m)) {
      // mensagem inteira no meio de pedaços não acontece numa conexão em ordem; se acontecer, descarta os pedaços
      this.parts = [];
      return m;
    }
    this.parts.push(m.d);
    if (!m.end) return undefined;
    const s = this.parts.join('');
    this.parts = [];
    try {
      return JSON.parse(s) as unknown;
    } catch {
      return undefined;
    }
  }
}

/** JSON de cada mensagem já convertida (a mesma mensagem para vários jogadores vira texto uma vez só). */
const cache = new WeakMap<object, string>();

/** JSON de `msg`, guardado enquanto a mensagem existir. */
export function jsonOf(msg: unknown): string | undefined {
  if (!msg || typeof msg !== 'object') return JSON.stringify(msg);
  let s = cache.get(msg);
  if (s === undefined) {
    s = JSON.stringify(msg);
    cache.set(msg, s);
  }
  return s;
}

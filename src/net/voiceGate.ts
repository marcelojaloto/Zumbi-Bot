/**
 * Trava do chat de voz por idade. O ECA Digital (Lei 15.211/2025, art. 21) pede que jogos com conversa entre
 * jogadores limitem essa interação por padrão, para garantir o consentimento dos pais. A idade vem da loja (Play Age
 * Signals no Android, Declared Age Range no iOS 26 ou mais novo), só como "18 ou mais" ou "menos de 18", e não é
 * guardada nem enviada:
 *
 * - adulto confirmado pela loja: voz liberada;
 * - controle dos pais limitando a comunicação: voz bloqueada, sem como liberar no jogo;
 * - idade desconhecida (site, iOS antigo, não compartilhou) ou menor sem esse controle: voz desligada até um adulto
 *   responsável liberar neste aparelho.
 */

/** O que a loja disse (só os campos usados; a resposta do plugin @capawesome/capacitor-age-signals). */
export interface StoreAgeRange {
  status?: string;
  ageRange?: { lowerBound?: number; upperBound?: number; activeParentalControls?: string[] };
  significantChange?: { status?: string };
}

/** Leitura da loja: adulto, comunicação limitada pelos pais, ou nada que decida (fica com um adulto liberar). */
export type AgeSignal = 'adult' | 'limited' | 'unknown';

/** A voz neste aparelho: liberada, bloqueada pelos pais, ou esperando um adulto liberar. */
export type VoiceGateState = 'allowed' | 'blocked' | 'ask';

const STORE = 'zumbibot.voicegate.v1';

/** Resposta da loja → sinal de idade. */
export function readAgeSignal(r: StoreAgeRange | null | undefined): AgeSignal {
  const a = r?.status === 'SHARED' ? r.ageRange : undefined;
  if (!a) return 'unknown';
  if ((a.lowerBound ?? 0) >= 18) return 'adult';
  // iOS: limites de comunicação do Tempo de Uso; Android: o responsável recusou a mudança no Family Link
  if (
    a.activeParentalControls?.includes('COMMUNICATION_LIMITS') ||
    r?.significantChange?.status === 'DECLINED'
  )
    return 'limited';
  return 'unknown';
}

/** Pergunta a faixa de idade à loja (só no app; no site não há como saber). */
export async function storeAgeRange(): Promise<StoreAgeRange | null> {
  if (!__NATIVE__) return null;
  const { AgeSignals } = await import('@capawesome/capacitor-age-signals');
  // um só corte, nos 18: a loja não conta nada além do necessário
  return AgeSignals.requestAgeRange({ ageGates: [18] });
}

export class VoiceGate {
  private signal: AgeSignal = 'unknown';
  private checking: Promise<void> | null = null;
  /** A escolha, quando o aparelho não deixa guardar (vale até fechar o jogo). */
  private mem = '';

  constructor(
    private read: () => Promise<StoreAgeRange | null>,
    private onChange: () => void = () => {},
    private store: Pick<globalThis.Storage, 'getItem' | 'setItem'> | null = safeStorage(),
  ) {}

  /**
   * Consulta a loja uma vez por abertura do jogo. Só quando a voz importa (numa sala com voz), porque no iPhone a
   * pergunta pode aparecer na tela. Nunca lança erro: sem resposta, vale "idade desconhecida".
   */
  check(): Promise<void> {
    this.checking ??= this.read()
      .then(
        (r) => {
          this.signal = readAgeSignal(r);
        },
        () => {},
      )
      .finally(() => this.onChange());
    return this.checking;
  }

  get state(): VoiceGateState {
    if (this.signal === 'adult') return 'allowed';
    if (this.signal === 'limited') return 'blocked';
    return this.released ? 'allowed' : 'ask';
  }

  get allowed(): boolean {
    return this.state === 'allowed';
  }

  /** Um adulto responsável liberou o chat de voz neste aparelho. */
  get released(): boolean {
    try {
      const v = this.store?.getItem(STORE);
      if (v !== null && v !== undefined) return v === 'released';
    } catch {
      /* sem armazenamento: vale a escolha da memória */
    }
    return this.mem === 'released';
  }

  /** Um adulto responsável libera o chat de voz neste aparelho (vale até bloquear de novo nas Configurações). */
  release(): void {
    this.save('released');
  }

  /** Bloqueia de novo (Configurações > Áudio). */
  revoke(): void {
    this.save('');
  }

  private save(v: string): void {
    this.mem = v;
    try {
      this.store?.setItem(STORE, v);
    } catch {
      /* sem armazenamento: a escolha vale só até fechar o jogo */
    }
    this.onChange();
  }
}

function safeStorage(): Pick<globalThis.Storage, 'getItem' | 'setItem'> | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

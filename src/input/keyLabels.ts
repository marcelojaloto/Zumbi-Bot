import { t } from '../i18n';
import { KEY_NAMES_TO_TRANSLATE, editableKeys, keyLabel, type Action, type KeyMap } from './keymap';

let layout: ReadonlyMap<string, string> | null = null;

/** Pede ao navegador o desenho do teclado do jogador (Chrome/Edge); nos outros ficam os nomes padrão. */
export async function loadKeyboardLayout(): Promise<void> {
  try {
    const kb = (
      navigator as Navigator & { keyboard?: { getLayoutMap?: () => Promise<ReadonlyMap<string, string>> } }
    ).keyboard;
    if (kb?.getLayoutMap) layout = await kb.getLayoutMap();
  } catch {
    /* sem suporte ou sem permissão */
  }
}

/** Nome de uma tecla para mostrar na tela (no idioma atual). */
export function keyName(code: string): string {
  const s = keyLabel(code, layout);
  return KEY_NAMES_TO_TRANSLATE.includes(s) ? t(s) : s;
}

/** Tecla principal de cada ação (para textos como "J = soco"); "—" quando a ação ficou sem tecla. */
export function actionKeyNames(map: KeyMap): Record<Action, string> {
  const out = {} as Record<Action, string>;
  for (const a of Object.keys(map) as Action[]) {
    const k = editableKeys(map, a)[0];
    out[a] = k ? keyName(k) : '—';
  }
  return out;
}

/** As quatro direções juntas ("WASD", ou "I/J/K/L" quando alguma tem nome comprido). */
export function moveKeys(n: Record<Action, string>): string {
  const ks = [n.up, n.left, n.down, n.right];
  return ks.every((k) => k.length === 1) ? ks.join('') : ks.join('/');
}

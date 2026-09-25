/** Mini-helper para criar elementos DOM sem framework. */
export type Child = Node | string | null | undefined | false;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<Omit<HTMLElementTagNameMap[K], 'style' | 'dataset'>> & {
    class?: string;
    style?: string;
    data?: Record<string, string>;
  } = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  const { class: cls, style, data, ...rest } = props as Record<string, unknown>;
  if (cls) e.className = cls as string;
  if (style) e.setAttribute('style', style as string);
  if (data) for (const [k, v] of Object.entries(data as Record<string, string>)) e.dataset[k] = v;
  Object.assign(e, rest);
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

export function clear(e: HTMLElement): void {
  while (e.firstChild) e.removeChild(e.firstChild);
}

export function hexColor(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('pt-BR');
}

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Regra de arquitetura: a simulação e os dados não dependem de three.js nem do DOM,
// para que possam rodar em Node (testes) e futuramente num servidor/host de co-op.
const PURE_DIRS = ['core', 'sim', 'data', 'save'];
const FORBIDDEN = [/from\s+['"]three/, /\bdocument\./, /\bwindow\./, /\blocalStorage\b/, /Math\.random\(/];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith('.ts') && !p.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

describe('arquitetura', () => {
  for (const d of PURE_DIRS) {
    it(`src/${d} é puro (sem three/DOM/Math.random)`, () => {
      const root = join(__dirname, d);
      const offenders: string[] = [];
      for (const f of walk(root)) {
        const src = readFileSync(f, 'utf8');
        // save/storage.ts é o único ponto autorizado a tocar localStorage (via injeção).
        const rules = f.includes(join('save', 'storage'))
          ? FORBIDDEN.filter((r) => r.source !== '\\blocalStorage\\b')
          : FORBIDDEN;
        for (const r of rules) if (r.test(src)) offenders.push(`${f}: ${r}`);
      }
      expect(offenders).toEqual([]);
    });
  }
});

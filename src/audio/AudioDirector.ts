import { ENEMIES } from '../data/enemies';
import { ITEMS } from '../data/items';
import { FIREARMS } from '../data/weapons';
import type { GameEvent } from '../sim/events';
import type { World } from '../sim/World';
import type { AudioEngine } from './AudioEngine';

/** Mapeia eventos do sim em efeitos sonoros posicionados. */
export class AudioDirector {
  constructor(private a: AudioEngine) {}

  onEvents(events: GameEvent[], w: World): void {
    const a = this.a;
    if (!a.ctx) return;
    for (const ev of events) {
      switch (ev.t) {
        case 'swing':
          a.play(ev.heavy ? 'whooshHeavy' : 'whoosh', { x: w.get(ev.id)?.t.x, vol: 0.5 });
          break;
        case 'hit': {
          const dst = w.get(ev.dst);
          if (ev.blocked) {
            a.play('robotHit', { x: ev.x, vol: 0.5, rate: 1.4 });
            break;
          }
          if (ev.amount <= 0) break;
          const src = w.get(ev.src);
          const kind = dst?.kind;
          const robot = kind === 'player' || (kind === 'enemy' && ENEMIES[dst!.defId]?.family === 'robot');
          const vol = Math.min(1, 0.5 + ev.amount / 40);
          if (ev.dtype === 'blade') a.play('blade', { x: ev.x, vol });
          else if (ev.dtype === 'blunt')
            a.play(ev.heavy ? 'punchHeavy' : src?.player && !src.player.melee ? 'punch' : 'blunt', {
              x: ev.x,
              vol,
            });
          else if (ev.dtype === 'electric') a.play('zap', { x: ev.x, vol: 0.5 });
          if (robot) a.play('robotHit', { x: ev.x, vol: vol * 0.6 });
          else if (kind === 'enemy' || kind === 'boss') a.play('splat', { x: ev.x, vol: vol * 0.5 });
          else if (kind === 'prop') a.play('blunt', { x: ev.x, vol: 0.4, rate: 1.3 });
          if (kind === 'player') a.play('playerHurt', { x: ev.x, vol: 0.8 });
          break;
        }
        case 'death':
          if (ev.family === 'zombie') a.play('zombieDeath', { x: ev.x, vol: 0.7 });
          else if (ev.family === 'robot') a.play('robotDeath', { x: ev.x, vol: 0.8 });
          else if (ev.family === 'player') a.play('playerDeath', { x: ev.x });
          break;
        case 'groan':
          a.play('groan', { x: w.get(ev.id)?.t.x, vol: 0.35 });
          break;
        case 'shot': {
          if (ev.weapon === 'enemy') {
            const v = ev.visual;
            a.play(
              v === 'acid'
                ? 'spit'
                : v === 'tracer' || v === 'bullet'
                  ? 'enemyGun'
                  : v === 'rock' || v === 'tombstone'
                    ? 'whooshHeavy'
                    : 'enemyShot',
              { x: ev.x, vol: 0.55 },
            );
          } else a.play(FIREARMS[ev.weapon].sfx, { x: ev.x, vol: 0.8 });
          break;
        }
        case 'reload':
          a.play(ev.phase === 'shell' ? 'reloadShell' : ev.phase === 'start' ? 'reload' : 'swap', {
            x: w.get(ev.id)?.t.x,
            vol: 0.5,
          });
          break;
        case 'dryfire':
          a.play('dryfire', { vol: 0.5, bus: 'ui' });
          break;
        case 'weaponSwap':
          a.play('swap', { vol: 0.5, bus: 'ui' });
          break;
        case 'explosion':
          a.play(ev.r >= 2.5 ? 'explosion' : 'explosionSmall', { x: ev.x });
          a.duck(0.4, 0.5);
          break;
        case 'cast':
          a.play(`cast_${ev.staff}`, { x: ev.x, vol: 0.8 });
          break;
        case 'beam':
          if (ev.element === 'electric') a.play('zap', { x: ev.x1, vol: 0.6 });
          else if (ev.element === 'laser') a.play('enemyShot', { x: ev.x0, vol: 0.5, rate: 0.7 });
          break;
        case 'interaction':
          if (ev.kind === 'shatter') a.play('shatter', { x: w.get(ev.id)?.t.x });
          else if (ev.kind === 'steam') a.play('steam', { x: w.get(ev.id)?.t.x, vol: 0.6 });
          else if (ev.kind === 'conduct') a.play('zap', { x: w.get(ev.id)?.t.x });
          else if (ev.kind === 'freeze') a.play('cast_ice', { x: w.get(ev.id)?.t.x, vol: 0.6 });
          break;
        case 'jump':
          a.play(ev.double ? 'doubleJump' : 'jump', { x: w.get(ev.id)?.t.x, vol: 0.6 });
          break;
        case 'land':
          a.play('land', { x: w.get(ev.id)?.t.x, vol: ev.heavy ? 0.8 : 0.4 });
          break;
        case 'pickup': {
          const d = ITEMS[ev.item];
          const k = d?.effect.k;
          a.play(
            k === 'heal'
              ? 'pickupHealth'
              : k === 'ammo'
                ? 'pickupAmmo'
                : k === 'power'
                  ? 'pickupPower'
                  : k === 'scrap'
                    ? 'coin'
                    : k === 'cosmetic'
                      ? 'loot'
                      : 'pickup',
            { vol: 0.7, bus: 'ui' },
          );
          break;
        }
        case 'levelUp':
          a.play('levelUp', { bus: 'ui' });
          break;
        case 'unlock':
          a.play('unlock', { bus: 'ui' });
          break;
        case 'loot':
          if (ev.cosmetic && !ev.duplicate) a.play('loot', { bus: 'ui' });
          else a.play('coin', { bus: 'ui', vol: 0.6 });
          break;
        case 'propBreak':
          a.play(ev.kind === 'explosiveBarrel' || ev.kind === 'car' ? 'explosionSmall' : 'propBreak', {
            x: ev.x,
            vol: 0.8,
          });
          break;
        case 'go':
          a.play('go', { bus: 'ui', vol: 0.8 });
          break;
        case 'bossIntro':
          a.play('roar', { vol: 1 });
          a.duck(0.3, 1.5);
          break;
        case 'bossPhase':
          a.play('bossPhase', { vol: 1 });
          a.play('roar', { vol: 0.8, rate: 0.8 });
          break;
        case 'bossDefeated':
          a.play('roar', { vol: 1, rate: 0.6 });
          a.play('explosion', {});
          break;
        case 'telegraph':
          a.play('telegraph', { x: ev.x, vol: 0.35 });
          break;
        case 'sfx':
          a.play(ev.id, { x: ev.x, vol: ev.vol ?? 0.8 });
          break;
        case 'victory':
          a.play('victory', { bus: 'ui' });
          break;
        case 'gameOver':
          a.play('gameover', { bus: 'ui' });
          break;
        case 'meleeBreak':
          a.play('propBreak', { bus: 'ui', vol: 0.6, rate: 1.4 });
          break;
        default:
          break;
      }
    }
  }
}

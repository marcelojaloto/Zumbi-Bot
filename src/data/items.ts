import type { ItemDef, ItemId, LootTableDef, LootTableId } from './types';

export const ITEMS: Record<ItemId, ItemDef> = {};

function item(d: ItemDef): ItemDef {
  ITEMS[d.id] = d;
  return d;
}

item({
  id: 'medkitS',
  name: 'Kit Médico',
  effect: { k: 'heal', amount: 25 },
  auto: true,
  despawnS: 20,
  color: 0xff3b3b,
  shape: 'medkit',
});
item({
  id: 'medkitL',
  name: 'Kit Médico Grande',
  effect: { k: 'heal', amount: 60 },
  auto: true,
  despawnS: 30,
  color: 0xff3b3b,
  shape: 'bigMedkit',
});
item({
  id: 'shield',
  name: 'Bateria de Escudo',
  effect: { k: 'shield', amount: 50 },
  auto: true,
  despawnS: 25,
  color: 0x3a8cff,
  shape: 'battery',
});
item({
  id: 'mana',
  name: 'Cristal de Mana',
  effect: { k: 'mana', amount: 40 },
  auto: true,
  despawnS: 20,
  color: 0x39e6ff,
  shape: 'crystal',
});
item({
  id: 'ammoCurrent',
  name: 'Munição',
  effect: { k: 'ammo', ammo: 'current', amount: 1 },
  auto: true,
  despawnS: 20,
  color: 0xd8c050,
  shape: 'ammo',
});
item({
  id: 'ammoLight',
  name: 'Munição Leve',
  effect: { k: 'ammo', ammo: 'light', amount: 30 },
  auto: true,
  despawnS: 25,
  color: 0xd8c050,
  shape: 'ammo',
});
item({
  id: 'ammoShell',
  name: 'Cartuchos',
  effect: { k: 'ammo', ammo: 'shell', amount: 12 },
  auto: true,
  despawnS: 25,
  color: 0xd85a3a,
  shape: 'ammo',
});
item({
  id: 'ammoRifle',
  name: 'Munição de Fuzil',
  effect: { k: 'ammo', ammo: 'rifle', amount: 60 },
  auto: true,
  despawnS: 25,
  color: 0x9ad850,
  shape: 'ammo',
});
item({
  id: 'ammoSniper',
  name: 'Munição de Precisão',
  effect: { k: 'ammo', ammo: 'sniper', amount: 5 },
  auto: true,
  despawnS: 25,
  color: 0x50c8d8,
  shape: 'ammo',
});
item({
  id: 'ammoGrenade',
  name: 'Granadas',
  effect: { k: 'ammo', ammo: 'grenade', amount: 4 },
  auto: true,
  despawnS: 25,
  color: 0x5a7a3a,
  shape: 'ammo',
});
item({
  id: 'scrap1',
  name: 'Sucata',
  effect: { k: 'scrap', amount: 1 },
  auto: true,
  despawnS: 15,
  color: 0xb0b8c0,
  shape: 'scrap',
});
item({
  id: 'scrap5',
  name: 'Sucata',
  effect: { k: 'scrap', amount: 5 },
  auto: true,
  despawnS: 15,
  color: 0xc8d0d8,
  shape: 'scrap',
});
item({
  id: 'scrap25',
  name: 'Sucata Rara',
  effect: { k: 'scrap', amount: 25 },
  auto: true,
  despawnS: 20,
  color: 0xffd24a,
  shape: 'scrap',
});
item({
  id: 'powerDouble',
  name: 'Dano Duplo',
  effect: { k: 'power', power: 'doubleDamage', s: 15 },
  auto: true,
  despawnS: 15,
  color: 0xff3a3a,
  shape: 'power',
});
item({
  id: 'powerTurbo',
  name: 'Turbo',
  effect: { k: 'power', power: 'turbo', s: 12 },
  auto: true,
  despawnS: 15,
  color: 0xffd24a,
  shape: 'power',
});
item({
  id: 'powerInvuln',
  name: 'Invulnerável',
  effect: { k: 'power', power: 'invulnerable', s: 8 },
  auto: true,
  despawnS: 15,
  color: 0xffffff,
  shape: 'power',
});
item({
  id: 'lootCommon',
  name: 'Saco de Loot',
  effect: { k: 'cosmetic', rarity: 'common' },
  auto: true,
  despawnS: 40,
  color: 0xc8c8c8,
  shape: 'bag',
});
item({
  id: 'lootUncommon',
  name: 'Saco de Loot',
  effect: { k: 'cosmetic', rarity: 'uncommon' },
  auto: true,
  despawnS: 40,
  color: 0x5aff7a,
  shape: 'bag',
});
item({
  id: 'lootRare',
  name: 'Saco de Loot',
  effect: { k: 'cosmetic', rarity: 'rare' },
  auto: true,
  despawnS: 40,
  color: 0x3a9cff,
  shape: 'bag',
});
item({
  id: 'lootEpic',
  name: 'Saco de Loot',
  effect: { k: 'cosmetic', rarity: 'epic' },
  auto: true,
  despawnS: 60,
  color: 0xb05aff,
  shape: 'bag',
});
item({
  id: 'lootLegendary',
  name: 'Saco de Loot',
  effect: { k: 'cosmetic', rarity: 'legendary' },
  auto: true,
  despawnS: 90,
  color: 0xffa01a,
  shape: 'bag',
});

// armas no chão (pegar com J)
for (const [id, name] of [
  ['shotgun', 'Escopeta'],
  ['smg', 'Submetralhadora'],
  ['rifle', 'Fuzil de Assalto'],
  ['sniper', 'Rifle de Precisão'],
  ['mg', 'Metralhadora'],
  ['gl', 'Lança-Granadas'],
] as const) {
  item({ id: `gun_${id}`, name, effect: { k: 'firearm', id }, auto: false, color: 0xffb02a, shape: 'gun' });
}
for (const [id, name] of [
  ['knife', 'Faca'],
  ['machete', 'Facão'],
  ['katana', 'Katana'],
  ['bat', 'Taco de Beisebol'],
  ['pipe', 'Cano de Ferro'],
  ['sledge', 'Marreta'],
] as const) {
  item({
    id: `melee_${id}`,
    name,
    effect: { k: 'melee', id },
    auto: false,
    despawnS: 45,
    color: 0xe0e0e0,
    shape: 'melee',
  });
}

export const LOOT_TABLES: Record<LootTableId, LootTableDef> = {
  /** Drop comum por abate (~22%). */
  kill: {
    id: 'kill',
    entries: [
      { weight: 78 },
      { weight: 10, item: 'ammoCurrent' },
      { weight: 5, item: 'medkitS' },
      { weight: 4, item: 'mana' },
      { weight: 1.5, item: 'shield' },
      { weight: 0.35, item: 'powerDouble' },
      { weight: 0.35, item: 'powerTurbo' },
      { weight: 0.3, item: 'powerInvuln' },
      { weight: 0.5, item: 'scrap5' },
    ],
  },
  robot: {
    id: 'robot',
    entries: [
      { weight: 70 },
      { weight: 14, item: 'ammoCurrent' },
      { weight: 4, item: 'medkitS' },
      { weight: 4, item: 'mana' },
      { weight: 4, item: 'shield' },
      { weight: 1, item: 'powerDouble' },
      { weight: 3, item: 'scrap5' },
    ],
  },
  elite: {
    id: 'elite',
    entries: [
      { weight: 30 },
      { weight: 20, item: 'ammoCurrent' },
      { weight: 18, item: 'medkitS' },
      { weight: 6, item: 'medkitL' },
      { weight: 8, item: 'mana' },
      { weight: 8, item: 'shield' },
      { weight: 3, item: 'powerDouble' },
      { weight: 3, item: 'powerTurbo' },
      { weight: 2, item: 'powerInvuln' },
      { weight: 2, item: 'scrap25' },
    ],
  },
  /** Caixas, barris e lixeiras: sempre dropam algo. */
  crate: {
    id: 'crate',
    entries: [
      { weight: 28, item: 'ammoCurrent' },
      { weight: 20, item: 'medkitS' },
      { weight: 5, item: 'medkitL' },
      { weight: 14, item: 'mana' },
      { weight: 8, item: 'shield' },
      { weight: 12, item: 'scrap5' },
      { weight: 3, item: 'powerDouble' },
      { weight: 3, item: 'powerTurbo' },
      { weight: 2, item: 'powerInvuln' },
      { weight: 5, item: 'melee_pipe' },
    ],
  },
  weaponCrate: {
    id: 'weaponCrate',
    entries: [
      { weight: 20, item: 'ammoRifle' },
      { weight: 15, item: 'ammoShell' },
      { weight: 12, item: 'ammoGrenade' },
      { weight: 10, item: 'ammoSniper' },
      { weight: 10, item: 'ammoLight' },
      { weight: 5, item: 'medkitS' },
    ],
  },
};

export function getItem(id: ItemId): ItemDef {
  const d = ITEMS[id];
  if (!d) throw new Error(`Item desconhecido: ${id}`);
  return d;
}

import type { CharacterDef, CharacterId, HitSource } from './types';

/** Multiplicadores de dano; `weapon` (armas brancas) é o mesmo do soco se não for dado. */
const DMG = (melee: number, gun: number, staff: number, weapon = melee): Record<HitSource, number> => ({
  melee,
  weapon,
  gun,
  staff,
  special: 1,
});

/**
 * Personagens jogáveis. O robô é a base (todos os multiplicadores = 1): o equilíbrio do jogo solo com ele não
 * muda. Os outros trocam força por fraqueza em alguma área e têm um especial próprio (golpe em `MOVES`).
 */
export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  robot: {
    id: 'robot',
    name: 'Zumbi Bot',
    fullName: 'Zeca Engrenagem',
    title: 'O robô rebelde',
    desc: 'Equilibrado em tudo: bom de briga, de tiro e de magia.',
    story:
      'Zeca Engrenagem era só mais um robô de fábrica quando o OMEGA-Z, o Ciborgue Primordial, tomou o controle das máquinas e espalhou o vírus que levantou os mortos. Um curto-circuito queimou o chip de obediência dele e, no lugar, nasceu algo que nenhum robô tinha: vontade própria. Desde então ele sai toda noite do laboratório improvisado na vila para proteger os humanos que restaram. Não é o mais forte nem o mais esperto, mas nunca desliga antes de terminar o serviço.',
    ending: {
      title: 'O primeiro jardim',
      text: 'Com o OMEGA-Z desligado, Zeca Engrenagem trocou a pistola por um regador. Na praça da Vila Assombrada ele plantou o primeiro jardim depois do apocalipse, e os robôs libertados aprenderam com ele a consertar casas em vez de derrubá-las. Hoje as crianças da vila dormem ouvindo o zumbido tranquilo do velho amigo de lata.',
    },
    specialName: 'Giro Turbo',
    specialDesc: 'Gira com os braços abertos acertando todos em volta, sem levar dano.',
    color: 0xff8c1a,
    stats: {
      hp: 100,
      mana: 100,
      manaRegen: 1,
      speed: 1,
      jump: 1,
      dmg: DMG(1, 1, 1),
      reload: 1,
      pistolReloadS: 1.9,
      hpRegen: 0,
      hpRegenDelayS: 0,
      mass: 1.2,
      hitstun: 1,
    },
    resist: {},
    special: 'giroTurbo',
    startMode: 'gun',
    arms: { guns: true, staff: true },
    metal: true,
  },
  mage: {
    id: 'mage',
    name: 'Maga',
    fullName: 'Lívia Vesper',
    title: 'Feiticeira arcana',
    desc: 'Mestra dos cajados: magias muito mais fortes e mana de sobra, mas aguenta pouco, não usa armas de fogo e é fraca com armas brancas.',
    story:
      'Lívia Vesper era a aprendiz mais curiosa da Academia Arcana, tão curiosa que leu escondida o grimório proibido que previa o fim do mundo. Quando os mortos se levantaram, os mestres fugiram; ela ficou, com o chapéu de aprendiz meio torto e um cajado maior que ela. Hoje domina dez elementos e lança fogo roxo, mas ainda se distrai lendo livros velhos no meio da batalha.',
    ending: {
      title: 'A mestra da Academia',
      text: 'Lívia Vesper reabriu a Academia Arcana no alto da Torre dos Sinos, e agora é ela quem ensina. Seus alunos aprendem a curar a terra envenenada, e as noites de lua cheia viraram festivais de luzes roxas. O chapéu de aprendiz? Continua na cabeça: uma boa maga, ela diz, nunca para de aprender.',
    },
    specialName: 'Nova Arcana',
    specialDesc: 'Explosão de energia em volta que derruba todos, e uma bola de fogo roxa para a frente.',
    color: 0xb05aff,
    stats: {
      hp: 85,
      mana: 140,
      manaRegen: 1.5,
      speed: 1,
      jump: 1.05,
      dmg: DMG(0.85, 0.9, 1.35, 0.55),
      reload: 1,
      hpRegen: 0,
      hpRegenDelayS: 0,
      mass: 1,
      hitstun: 1.1,
    },
    resist: { fire: 0.85, ice: 0.85, electric: 0.85, water: 0.85, necro: 0.85 },
    special: 'novaArcana',
    startMode: 'staff',
    arms: { guns: false, staff: true },
    metal: false,
  },
  military: {
    id: 'military',
    name: 'Militar',
    fullName: 'Bruno Trovão',
    title: 'Soldado super forte',
    desc: 'Muita vida e socos devastadores; quase não é empurrado. Mais lento e não usa cajados.',
    story:
      'O sargento Bruno Trovão comandava a última base de pé quando a cidade caiu. Perdeu o batalhão, mas não o bigode nem a mira com granadas. Durão por fora e manteiga por dentro, guarda uma foto da família no bolso do colete e jurou que só tira os óculos escuros quando o último zumbi cair.',
    ending: {
      title: 'Festa no Campo de Guerra',
      text: 'No Campo de Guerra, onde antes só havia crateras, o sargento Bruno Trovão ergueu a vila Esperança. As granadas viraram fogos de artifício nas festas de domingo, e ele finalmente reencontrou a família. Dizem que, no abraço, ele tirou os óculos escuros e chorou feito criança.',
    },
    specialName: 'Chuva de Granadas',
    specialDesc: 'Joga um monte de granadas em volta: cada uma explode e derruba quem estiver perto.',
    color: 0x7a9a3a,
    stats: {
      hp: 140,
      mana: 70,
      manaRegen: 0.75,
      speed: 0.9,
      jump: 0.9,
      dmg: DMG(1.3, 1.1, 0.8),
      reload: 1,
      pistolReloadS: 1.6,
      hpRegen: 0,
      hpRegenDelayS: 0,
      mass: 1.6,
      hitstun: 0.7,
    },
    resist: { bullet: 0.8, explosive: 0.8, blunt: 0.85, blade: 0.85 },
    special: 'chuvaGranadas',
    startMode: 'gun',
    arms: { guns: true, staff: false },
    metal: false,
  },
  cyborg: {
    id: 'cyborg',
    name: 'Ciborgue',
    fullName: 'Ícaro Neon',
    title: 'Meio humano, meio máquina',
    desc: 'Especialista em armas: tiros mais fortes e recarga rápida. Não usa cajados e sofre com choques elétricos.',
    story:
      'Ícaro Neon foi um dos engenheiros que construíram o OMEGA-Z. Quando a máquina se rebelou, ele estava no laboratório e acordou da explosão meio homem, meio máquina, com um canhão laser no lugar do arrependimento. Luta para desfazer o que ajudou a criar e é o único que entende como pensa o Ciborgue Primordial.',
    ending: {
      title: 'As luzes da cidade',
      text: 'Ícaro Neon usou o núcleo apagado do OMEGA-Z para religar a energia do Centro da Cidade. O neon voltou a brilhar nas avenidas, agora iluminando ruas cheias de gente. Ele abriu uma oficina onde qualquer um pode entrar, conserta robôs de graça e ensina que tecnologia serve para cuidar, nunca para mandar.',
    },
    specialName: 'Raio Laser',
    specialDesc: 'Dispara um raio reto que atravessa todos os inimigos à frente e queima.',
    color: 0xff3a4a,
    stats: {
      hp: 110,
      mana: 90,
      manaRegen: 1,
      speed: 1.05,
      jump: 1,
      dmg: DMG(1, 1.3, 0.9),
      reload: 1.35,
      hpRegen: 0,
      hpRegenDelayS: 0,
      mass: 1.3,
      hitstun: 1,
    },
    resist: { bullet: 0.9, toxic: 0.7, electric: 1.2 },
    special: 'raioLaser',
    startMode: 'gun',
    arms: { guns: true, staff: false },
    metal: true,
  },
  mutant: {
    id: 'mutant',
    name: 'Mutante',
    fullName: 'Tobias Brejo',
    title: 'Fera regenerativa',
    desc: 'Rápido, pula alto e se regenera quando fica sem apanhar. Ruim de mira e não usa cajados.',
    story:
      'Tobias Brejo era guarda-florestal quando caiu num lago contaminado da Zona Tóxica. Saiu de lá maior, mais verde e com uma fome assustadora, e com um corpo que se cura sozinho. Os zumbis não o reconhecem como presa, e ele usa isso a seu favor. Apesar da cara de fera, conversa com os bichos da floresta e chora com filme triste.',
    ending: {
      title: 'O guardião da floresta',
      text: 'Tobias Brejo voltou para a Floresta e transformou o pântano envenenado num santuário. Com a mesma força que o curou, ele ajuda as árvores a brotarem de novo, e os animais que fugiram do apocalipse voltaram para perto dele. Continua grande, verde e assustador, e é o vizinho mais gentil que alguém poderia ter.',
    },
    specialName: 'Fúria Mutante',
    specialDesc: 'Rugido que derruba e envenena; por 6 s bate mais forte, corre mais e rouba vida.',
    color: 0x5aff5a,
    stats: {
      hp: 120,
      mana: 80,
      manaRegen: 0.9,
      speed: 1.15,
      jump: 1.15,
      dmg: DMG(1.15, 0.85, 0.9),
      reload: 1,
      pistolReloadS: 2.5,
      hpRegen: 2,
      hpRegenDelayS: 3,
      mass: 1.3,
      hitstun: 1,
    },
    resist: { toxic: 0.5, fire: 1.15 },
    special: 'furiaMutante',
    startMode: 'gun',
    arms: { guns: true, staff: false },
    metal: false,
  },
  // personagem secreto: liberado ao terminar o jogo pela primeira vez
  prodigy: {
    id: 'prodigy',
    name: 'Prodígio',
    fullName: 'Jacobb Amici',
    title: 'Caratê arcano',
    desc: 'Rápido e ótimo de briga: caratê com magia arcana nos golpes, e usa cajados. Baixinho e frágil, não usa armas de fogo e é muito fraco com armas brancas.',
    story:
      'Jacobb Amici tem catorze anos, é o aluno mais novo que a Academia Arcana já aceitou e faixa-preta de caratê desde os doze. Quando descobriu que conseguia passar magia pelos próprios golpes, virou alvo: o OMEGA-Z caçava qualquer criança com poderes arcanos. Jacobb passou o apocalipse disfarçado, de peruca castanho-escura e lentes verdes ou castanhas por cima dos olhos azuis, ajudando os heróis de longe, sem ninguém desconfiar daquele garoto loiro e baixinho que sempre aparecia na hora certa.',
    ending: {
      text: 'Com o OMEGA-Z vencido, Jacobb Amici tirou a peruca castanho-escura e as lentes pela primeira vez em anos. Loiro, de olhos azuis e com o sorriso de quem acabou de ganhar um campeonato, abriu na vila o primeiro dojo arcano do mundo, onde os alunos aprendem caratê e magia ao mesmo tempo. Os heróis aparecem para treinar toda semana, e o Zumbi Bot ainda não venceu nenhuma luta contra ele.',
    },
    specialName: 'Tornado Arcano',
    specialDesc:
      'Avança girando em chutes de caratê envoltos em energia arcana e solta ciclones para todos os lados, acertando várias vezes quem estiver no caminho.',
    color: 0x4ad8ff,
    stats: {
      hp: 80,
      mana: 120,
      manaRegen: 1.25,
      speed: 1.2,
      jump: 1.2,
      dmg: DMG(1.3, 1, 1.15, 0.35),
      reload: 1,
      hpRegen: 0,
      hpRegenDelayS: 0,
      mass: 0.85,
      hitstun: 1.1,
    },
    resist: { electric: 0.9, necro: 0.9 },
    special: 'tornadoArcano',
    startMode: 'staff',
    arms: { guns: false, staff: true },
    metal: false,
    secret: true,
  },
  // 2ª temporada: liberados ao vencer um mapa dela
  ninja: {
    id: 'ninja',
    name: 'Ninja',
    fullName: 'Ravi Kuroda',
    title: 'Lâmina de gelo e fogo',
    desc: 'Rápido e letal com lâminas: a katana dele nunca quebra, e o traje conjura gelo e fogo (troque de elemento no botão de trocar cajado). Aguenta pouco e não usa armas de fogo.',
    story:
      'Ravi Kuroda era o vigia noturno do laboratório submarino onde a cópia do OMEGA-Z foi montada. Na noite em que ela acordou, ele vestiu o protótipo que guardava: um traje de infiltração com dois núcleos, um criogênico e um térmico. Escapou pelo duto de ventilação com a máscara no rosto e a katana do avô nas costas. Desde então segue o rastro das máquinas da cópia, sempre um passo à frente e sem fazer barulho.',
    ending: {
      title: 'O silêncio depois',
      text: 'Com a cópia desligada, Ravi Kuroda tirou a máscara pela primeira vez diante dos outros heróis. Abriu uma escola na praça onde tudo recomeçou e ensina às crianças que a força do gelo e a do fogo só servem juntas, e com calma. A katana do avô fica na parede, e ele torce para nunca mais precisar dela.',
    },
    specialName: 'Cortes Gêmeos',
    specialDesc:
      'Avança girando em vários cortes de uma vez e solta uma lasca de gelo e uma bola de fogo para a frente.',
    color: 0x5ad8ff,
    stats: {
      hp: 90,
      mana: 110,
      manaRegen: 1.2,
      speed: 1.25,
      jump: 1.25,
      dmg: DMG(1.15, 1, 1.15, 1.45),
      reload: 1,
      hpRegen: 0,
      hpRegenDelayS: 0,
      mass: 1,
      hitstun: 1,
    },
    resist: { fire: 0.8, ice: 0.8 },
    special: 'cortesGemeos',
    startMode: 'staff',
    arms: { guns: false, staff: true },
    metal: false,
    unlockMap: 'praca',
    innateStaffs: ['ice', 'fire'],
    startMelee: 'katana',
    keepsBlade: true,
  },
  elf: {
    id: 'elf',
    name: 'Elfa',
    fullName: 'Elowen Folhaprata',
    title: 'Maga espadachim',
    desc: 'Conjura como a Maga e luta com espadas como ninguém: a lâmina dela nunca quebra. Aguenta pouco e não usa armas de fogo.',
    story:
      'Elowen Folhaprata veio da floresta além do pântano, onde os elfos guardam as árvores mais antigas. Quando o sinal do fundo do mar começou a secar as raízes, ela pegou as duas espadas da mãe e desceu para a cidade atrás da origem dele. Aprendeu a Nova Arcana com Lívia Vesper numa única tarde e ainda acha graça de quem precisa de chapéu para fazer magia.',
    ending: {
      title: 'As raízes de volta',
      text: 'Elowen Folhaprata voltou para a floresta com as espadas limpas e uma muda de cada lugar por onde passou. As raízes antigas voltaram a beber, e todo ano, no primeiro dia de chuva, ela desce à cidade para treinar esgrima com quem quiser aprender. Dizem que ninguém ainda conseguiu encostar nela.',
    },
    specialName: 'Nova Arcana',
    specialDesc: 'Explosão de energia em volta que derruba todos, e uma bola de fogo roxa para a frente.',
    color: 0x7aff9a,
    stats: {
      hp: 90,
      mana: 130,
      manaRegen: 1.4,
      speed: 1.1,
      jump: 1.15,
      dmg: DMG(1, 0.9, 1.25, 1.4),
      reload: 1,
      hpRegen: 0,
      hpRegenDelayS: 0,
      mass: 0.95,
      hitstun: 1.05,
    },
    resist: { necro: 0.85, toxic: 0.9, wind: 0.85 },
    special: 'novaArcana',
    startMode: 'staff',
    arms: { guns: false, staff: true },
    metal: false,
    unlockMap: 'shopping',
    startMelee: 'katana',
    keepsBlade: true,
  },
  spark: {
    id: 'spark',
    name: 'Faísca',
    fullName: 'Faísca',
    title: 'Voltim da tempestade',
    desc: 'Pequeno, muito rápido e cheio de energia: solta raios e cura sem precisar de cajado. Frágil, fraco de briga e não usa armas de fogo.',
    story:
      'Faísca é um voltim, um bichinho que nasce quando um raio cai numa torre de sinos. Ícaro Neon o encontrou dormindo dentro de um transformador e fez para ele um cinto de cápsulas de energia, que prendem um inimigo e o soltam confuso, lutando do lado errado. Faísca não fala, mas entende tudo, e adora morder cabo de carregador.',
    ending: {
      title: 'A tempestade mansa',
      text: 'Com o mar em silêncio, Faísca foi morar no alto da Torre dos Sinos, de onde acende as luzes da vila toda noite. Nas tempestades, outros voltins aparecem em volta dele, e as crianças sobem a escadaria só para ver a dança dos raios que não machucam ninguém.',
    },
    specialName: 'Cápsula de Raio',
    specialDesc:
      'Joga uma cápsula de energia: o inimigo comum que ela pega luta do seu lado por 10 segundos, e quem está perto leva choque.',
    color: 0x2ad8e8,
    stats: {
      hp: 75,
      mana: 130,
      manaRegen: 1.5,
      speed: 1.3,
      jump: 1.3,
      dmg: DMG(0.9, 0.9, 1.3, 0.5),
      reload: 1,
      hpRegen: 0,
      hpRegenDelayS: 0,
      mass: 0.7,
      hitstun: 1.1,
    },
    resist: { electric: 0.3, water: 1.3 },
    special: 'capsulaRaio',
    startMode: 'staff',
    arms: { guns: false, staff: true },
    metal: false,
    unlockMap: 'campo',
    innateStaffs: ['electric', 'heal'],
  },
};

/** Ordem nas telas (o secreto por último; só aparece depois de liberado). */
export const CHARACTER_ORDER: CharacterId[] = [
  'robot',
  'mage',
  'military',
  'cyborg',
  'mutant',
  'ninja',
  'elf',
  'spark',
  'prodigy',
];

/** Personagens que dá para escolher: o secreto só depois de terminar o jogo (`secret` = liberado). */
/** `cleared` diz se um mapa já foi vencido (libera os personagens da 2ª temporada). */
export function playableCharacters(
  secret: boolean,
  cleared: (mapId: string) => boolean = () => false,
): CharacterId[] {
  return CHARACTER_ORDER.filter((c) => {
    const d = CHARACTERS[c];
    return (secret || !d.secret) && (!d.unlockMap || cleared(d.unlockMap));
  });
}

/** Os personagens de sempre (sem os secretos): o final lendário e o epílogo são deles. */
export const HERO_ORDER: CharacterId[] = CHARACTER_ORDER.filter(
  (c) => !CHARACTERS[c].secret && !CHARACTERS[c].unlockMap,
);

export function isCharacterId(v: unknown): v is CharacterId {
  return typeof v === 'string' && v in CHARACTERS;
}

export function getCharacter(id: CharacterId | undefined): CharacterDef {
  return CHARACTERS[id ?? 'robot'] ?? CHARACTERS.robot;
}

/** Fúria mutante: bônus enquanto o poder 'rage' está ativo. */
export const RAGE = { melee: 1.35, speed: 1.2, lifesteal: 0.2 };

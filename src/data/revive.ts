import type { CharacterId } from './types';

/**
 * Item especial de reviver: cada personagem tem o seu, ligado à história dele, e carrega no máximo um. Quando ele
 * cai, o item o levanta ali mesmo (sem gastar vida) e se gasta. Compra-se na Loja ou sai no baú do fim de fase.
 */
export interface ReviveItemDef {
  character: CharacterId;
  /** Textos em português (chaves de tradução). */
  name: string;
  /** De onde veio o item e por que ele levanta o dono. */
  story: string;
  /** Ícone curto (HUD, loja e baú). */
  icon: string;
  color: number;
}

export const REVIVE_ITEMS: Record<CharacterId, ReviveItemDef> = {
  robot: {
    character: 'robot',
    name: 'Bateria de Reserva',
    story:
      'A primeira bateria que Zeca Engrenagem tirou da sucata da fábrica, na noite em que ganhou vontade própria. Ele a guarda no peito, ligada a um fio solto: quando o corpo dele apaga, ela dá a partida de novo.',
    icon: '🔋',
    color: 0xff8c1a,
  },
  mage: {
    character: 'mage',
    name: 'Pena de Fênix',
    story:
      'Lívia Vesper ganhou a pena da fênix que guardava a biblioteca da Academia Arcana, depois de passar três noites lendo para ela. Quando a dona cai, a pena acende em fogo roxo e a ergue das cinzas.',
    icon: '🔥',
    color: 0xc07aff,
  },
  military: {
    character: 'military',
    name: 'Plaqueta do Batalhão',
    story:
      'A plaqueta de identificação que Bruno Trovão carrega junto da foto da família, gravada com o nome de cada soldado do batalhão que ele perdeu. Caído, ele lembra de todos eles e levanta de novo.',
    icon: '🎖️',
    color: 0x9aa84a,
  },
  cyborg: {
    character: 'cyborg',
    name: 'Chip de Backup',
    story:
      'Uma cópia da mente de Ícaro Neon, gravada no último chip que ele roubou do laboratório do OMEGA-Z. Se o corpo para, o chip reinicia tudo em segundos, com a memória intacta.',
    icon: '💾',
    color: 0x39e6ff,
  },
  mutant: {
    character: 'mutant',
    name: 'Soro do Lago',
    story:
      'Um frasco da água do lago que transformou Tobias Brejo, filtrada pelas raízes da floresta até ficar limpa. Uma gota no chão onde ele caiu e o corpo dele se refaz na hora.',
    icon: '🧪',
    color: 0x6aff4a,
  },
  prodigy: {
    character: 'prodigy',
    name: 'Faixa do Mestre',
    story:
      'A faixa-preta que o velho mestre deu a Jacobb Amici antes de sumir no apocalipse, bordada com uma runa arcana de proteção. Enquanto ele a carrega, nenhuma queda é a última.',
    icon: '🥋',
    color: 0x4ad8ff,
  },
};

/** Vida com que o item levanta o dono (fração da vida máxima) e a invencibilidade logo depois (ticks). */
export const REVIVE = { hpFrac: 0.5, invuln: 180, delayTicks: 75 };

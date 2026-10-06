import { locale, t } from '../i18n';

/** Política de privacidade publicada (a mesma das lojas). */
export const PRIVACY_URL = 'https://marcelojaloto.github.io/Zumbi-Bot/privacy/';
/** Regras de convivência, guia para pais e canal de denúncias (Lei 14.852/2024, art. 16; ECA Digital, arts. 16 e 28). */
export const SAFETY_URL = 'https://marcelojaloto.github.io/Zumbi-Bot/seguranca/';
/** Canal com quem joga: dúvidas, pedidos sobre dados e denúncias. */
export const CONTACT_EMAIL = 'jaloto.software@gmail.com';

/** E-mail de denúncia já com o código da sala e a hora, para quem denuncia só contar o que aconteceu. */
export function reportMailto(code: string, when = new Date()): string {
  const body = [
    t('Sala: {code}', { code }),
    t('Data e hora: {when}', { when: when.toLocaleString(locale()) }),
    t('Quem (P1 a P5 e personagem, se souber):'),
    t('O que aconteceu:'),
    '',
  ].join('\n');
  const subject = t('Denúncia no jogo online do Zumbi Bot');
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

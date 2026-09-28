/**
 * Projeto Firebase do ranking global (passo a passo em docs/RANKING_GLOBAL.md). Os valores vêm das variáveis do
 * repositório no GitHub (VITE_FIREBASE_API_KEY e VITE_FIREBASE_DB_URL, usadas no build) ou podem ser escritos
 * aqui. São públicos por natureza: quem protege os dados são as regras do banco (firebase/database.rules.json).
 * Vazio = ranking global desligado (o botão nem aparece).
 */
export const FIREBASE_CONFIG = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined) || '',
  databaseURL: (import.meta.env.VITE_FIREBASE_DB_URL as string | undefined) || '',
};

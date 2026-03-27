import { GoogleGenAI } from '@google/genai';

const LOCAL_KEY = 'atena_garden_gemini_key';

export function getSavedGeminiKey(): string {
  if (typeof window !== 'undefined') {
    try {
      return localStorage.getItem(LOCAL_KEY)?.trim() || '';
    } catch {
      // ignore
    }
  }
  return (import.meta.env.VITE_GEMINI_API_KEY || '').trim();
}

export function saveGeminiKeyLocally(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_KEY, key.trim());
}

export function clearGeminiKeyLocally() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_KEY);
}

export function getGeminiClient() {
  const apiKey = getSavedGeminiKey();
  if (!apiKey) {
    throw new Error('missing-gemini-key');
  }
  return new GoogleGenAI({ apiKey });
}

export function getGeminiErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === 'missing-gemini-key') {
    return 'Cadastre sua chave do Gemini em Configurações > IA para usar este recurso neste dispositivo.';
  }
  return fallback;
}

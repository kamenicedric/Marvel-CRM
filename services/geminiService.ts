
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Space, SpaceInsight } from "../types.ts";

const INSIGHT_CACHE_KEY = 'marvel_insight_cache_v3';
const CACHE_DURATION = 1000 * 60 * 30; // 30 minutes de cache pour réduire les appels

interface CacheEntry {
  insight: SpaceInsight;
  timestamp: number;
}

const retryWithBackoff = async <T>(fn: () => Promise<T>, maxRetries = 3, delay = 5000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    const isQuotaError = 
      error?.status === 429 || 
      errMsg.includes('429') ||
      errMsg.includes('RESOURCE_EXHAUSTED');

    if (maxRetries > 0 && isQuotaError) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, maxRetries - 1, delay * 2);
    }
    throw error;
  }
};

export const getSpaceInsight = async (space: Space): Promise<SpaceInsight> => {
  const rawCache = localStorage.getItem(INSIGHT_CACHE_KEY);
  const cache: Record<string, CacheEntry> = rawCache ? JSON.parse(rawCache) : {};
  
  if (cache[space.id] && (Date.now() - cache[space.id].timestamp < CACHE_DURATION)) {
    return cache[space.id].insight;
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    Tu es l'intelligence centrale de Marvel CRM. 
    Analyse l'espace "${space.name}" et fournis un briefing stratégique concis.
    Retourne TOUJOURS un objet JSON valide avec les champs: title, content, category.
  `;

  const prompt = `Briefing stratégique pour l'espace ID: "${space.id}".`;

  try {
    const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      },
    }));
    
    let text = response.text || "{}";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsed = JSON.parse(text);
    const insight = {
      title: String(parsed.title || "Analyse Stratégique"),
      content: String(parsed.content || "Données en cours d'indexation..."),
      category: String(parsed.category || "Système")
    };

    cache[space.id] = { insight, timestamp: Date.now() };
    localStorage.setItem(INSIGHT_CACHE_KEY, JSON.stringify(cache));

    return insight;
  } catch (error: any) {
    console.error("Gemini Insight Error:", error);
    const errMsg = error?.message || String(error);
    
    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      return {
        title: "Mode Économie de Flux",
        content: "L'analyse prédictive est en pause pour optimiser la bande passante.",
        category: "Système"
      };
    }

    return {
      title: "Analyse en attente",
      content: "La synchronisation neurale avec cet espace est temporairement indisponible.",
      category: "Système"
    };
  }
};

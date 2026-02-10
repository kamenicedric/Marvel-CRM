





import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const retryWithBackoff = async <T>(fn: () => Promise<T>, maxRetries = 4, delay = 3000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    const isQuotaError = 
      error?.status === 429 || 
      errorMessage.includes('429') ||
      errorMessage.includes('RESOURCE_EXHAUSTED');

    if (maxRetries > 0 && isQuotaError) {
      console.warn(`Quota API atteint (429). Nouvelle tentative dans ${delay}ms... (${maxRetries} restantes)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, maxRetries - 1, delay * 2);
    }
    throw error;
  }
};

export const generateCrmAssistance = async (prompt: string, context: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `
    Tu es l'assistant IA de Marvel CRM, un outil de gestion pour les mariages de luxe.
    Tu aides les gestionnaires à rédiger des emails, synthétiser l'état des projets ou donner des conseils de vente.
    Réponds toujours en Français.
    Context actuel: ${JSON.stringify(context)}
  `;

  try {
    const response: GenerateContentResponse = await retryWithBackoff(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    }));
    
    return response.text || "Désolé, je n'ai pas pu générer de réponse.";
  } catch (error: any) {
    console.error("Gemini Error Logic:", error);
    const errStr = error?.message || String(error);
    if (errStr.includes('429') || errStr.includes('RESOURCE_EXHAUSTED')) {
      return "Le système de briefing IA est temporairement saturé (Limite de quota atteinte). Veuillez réessayer dans quelques instants.";
    }
    return "Désolé, une erreur est survenue lors de la génération de l'assistance.";
  }
};

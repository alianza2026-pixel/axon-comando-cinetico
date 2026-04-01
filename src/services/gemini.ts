
import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosticResult } from "../types";

function getAIClient() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('sb_')) {
    console.warn("IA Desactivada: Falta llave de Google Gemini válida (la actual parece ser de Supabase).");
    return null;
  }
  try {
    return new GoogleGenAI(apiKey);
  } catch (e) {
    console.error("Error al inicializar cliente de IA:", e);
    return null;
  }
}

export async function analyzeSafetyData(data: any): Promise<DiagnosticResult> {
  const ai = getAIClient();
  if (!ai) {
    return {
      summary: "Servicio de IA no disponible. Por favor, configura una VITE_GEMINI_API_KEY válida de Google.",
      findings: ["Llave de IA faltante o inválida"],
      recommendations: ["Configurar API Key en el archivo .env"],
      safetyScore: 0,
      riskLevel: "bajo"
    } as any;
  }
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analiza los siguientes datos de seguridad industrial y proporciona un informe de diagnóstico en formato JSON:
    ${JSON.stringify(data)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: "Un resumen ejecutivo del estado de seguridad actual" },
          findings: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Lista de hallazgos críticos detectados"
          },
          recommendations: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Lista de mejoras de seguridad accionables"
          },
          safetyScore: { type: Type.NUMBER, description: "Una puntuación de 0 a 100 que representa la seguridad general" },
          riskLevel: { 
            type: Type.STRING, 
            enum: ["bajo", "medio", "alto"],
            description: "Nivel de riesgo general"
          }
        },
        required: ["summary", "findings", "recommendations", "safetyScore", "riskLevel"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateFormat(prompt: string): Promise<string> {
  const ai = getAIClient();
  if (!ai) return "Servicio de IA no disponible temporalmente. Por favor, configura una llave válida.";
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Eres un experto en Seguridad y Salud en el Trabajo (SST) en Colombia. 
    Tu tarea es generar un formato, matriz o documento técnico basado en la siguiente solicitud: "${prompt}".
    El documento debe seguir la normativa colombiana (Resolución 0312, Decreto 1072, etc.).
    Devuelve el contenido en formato Markdown bien estructurado, con tablas si es necesario.`,
  });

  return response.text || "No se pudo generar el documento.";
}

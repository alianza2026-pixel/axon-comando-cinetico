
import { GoogleGenAI, Type } from "@google/genai";
import { DiagnosticResult } from "../types";

function getAIClient() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('sb_')) {
    console.warn("IA Desactivada: Falta llave de Google Gemini válida.");
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey });
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
  const result = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{parts: [{ text: `Analiza los siguientes datos de seguridad industrial y proporciona un informe de diagnóstico en formato JSON:
    ${JSON.stringify(data)}`,
    }]}],
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
          },
          accidentRate: { type: Type.NUMBER, description: "Tasa de accidentalidad proyectada" },
          absenteeismRate: { type: Type.NUMBER, description: "Tasa de ausentismo calculada" },
          mitigationPlan: { type: Type.STRING, description: "Propuesta de programa de mitigación detallado" }
        },
        required: ["summary", "findings", "recommendations", "safetyScore", "riskLevel", "accidentRate", "absenteeismRate", "mitigationPlan"]
      }
    }
  });

  return JSON.parse(result.text ?? "{}");
}

export async function generateFormat(prompt: string): Promise<string> {
  const ai = getAIClient();
  if (!ai) return "Servicio de IA no disponible temporalmente. Por favor, configura una llave válida.";
  
  const result = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: `Eres un experto en Seguridad y Salud en el Trabajo (SST) en Colombia. 
    Tu tarea es generar un formato, matriz o documento técnico basado en la siguiente solicitud: "${prompt}".
    El documento debe seguir la normativa colombiana (Resolución 0312, Decreto 1072, etc.).
    Devuelve el contenido en formato Markdown bien estructurado, con tablas si es necesario.`
  });

  return result.text || "No se pudo generar el documento.";
}

export async function extractDocumentData(base64Data: string, mimeType: string): Promise<any> {
  const ai = getAIClient();
  if (!ai) return null;
  
  try {
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              }
            },
            {
              text: `Actúa como un asistente administrativo de SST. Analiza la imagen o PDF adjunto de un documento laboral (Examen Médico, Curso de Alturas, Certificado, etc.).
              Extrae la siguiente información y devuélvela estrictamente en formato JSON:
              - workerName (Nombre completo del trabajador)
              - docType (Tipo de documento: EXAMEN_MEDICO, CURSO_ALTURAS, CURSO_SST, OTRO)
              - issueDate (Fecha de emisión en formato YYYY-MM-DD)
              - expiryDate (Fecha de vencimiento en formato YYYY-MM-DD)
              - status (Estado o resultado: APTO, APTO_CON_RESTRICCIONES, NO_APTO, APROBADO)
              - details (Cualquier observación o hallazgo relevante)
              
              Si no encuentras algún campo, deja el valor como null.`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            workerName: { type: Type.STRING },
            docType: { type: Type.STRING },
            issueDate: { type: Type.STRING },
            expiryDate: { type: Type.STRING },
            status: { type: Type.STRING },
            details: { type: Type.STRING }
          },
          required: ["workerName", "docType", "issueDate", "expiryDate", "status"]
        }
      }
    });

    return JSON.parse(result.text ?? "{}");
  } catch (error) {
    console.error("Error extraiendo datos del documento:", error);
    return null;
  }
}

export async function extractFuratData(base64Data: string, mimeType: string): Promise<any> {
  const ai = getAIClient();
  if (!ai) return null;
  
  try {
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { data: base64Data, mimeType: mimeType } },
            {
              text: `Analiza el formulario FURAT (Reporte de Accidente de Trabajo) adjunto.
              Extrae los siguientes datos en formato JSON:
              - description (Descripción detallada del accidente del campo 50/51 del FURAT)
              - date (Fecha del accidente)
              - workerName (Nombre del trabajador)
              - severity (Inferencia de gravedad basada en la descripción: Leve, Grave, Mortal)`
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            date: { type: Type.STRING },
            workerName: { type: Type.STRING },
            severity: { type: Type.STRING, enum: ["Leve", "Grave", "Mortal"] }
          },
          required: ["description", "date", "workerName", "severity"]
        }
      }
    });

    return JSON.parse(result.text ?? "{}");
  } catch (error) {
    console.error("Error analizando FURAT:", error);
    return null;
  }
}

export async function generateAccidentInvestigation(incidence: any, company: any, worker: any): Promise<{investigation: string, improvementPlan: string, epsNotificationLetter: string}> {
  const ai = getAIClient();
  if (!ai) return { investigation: "Error: IA no disponible", improvementPlan: "", epsNotificationLetter: "" };
  
  const result = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: [{parts: [{ text: `Actúa como un Investigador Especialista en SST con licencia profesional colombiana. 
    Genera una INVESTIGACIÓN TÉCNICA DE ACCIDENTE DE TRABAJO y la CARTA DE NOTIFICACIÓN A LA EPS.
    
    DATOS EMPRESA: ${company.name} (NIT: ${company.nit}, RIESGO: ${company.riskLevel}, SECTOR: ${company.sector})
    TRABAJADOR: ${worker.name} (CARGO: ${worker.role}, EPS: ${worker.eps || 'No especificada'})
    DESCRIPCIÓN DEL EVENTO: ${incidence.description}
    DETALLES FURAT: ${incidence.furatDescription || 'N/A'}
    SEVERIDAD REPORTADA: ${incidence.severity}

    TU TAREA:
    1. Proporcionar un análisis técnico usando el Método de los 5 Porqués.
    2. Identificar Causas Inmediatas y Básicas.
    3. Proponer un PLAN DE MEJORAMIENTO detallado.
    4. Redactar una CARTA FORMAL DE NOTIFICACIÓN A LA EPS notificando el accidente de trabajo, citando la normatividad vigente y los datos del trabajador.
    
    Devuelve un JSON estrictamente estructurado así:
    {
            "investigation": "Markdown detallado de la investigación",
      "improvementPlan": "Markdown detallado con el plan de mejora sugerido",
      "epsNotificationLetter": "Markdown con la carta formal dirigida a la EPS"
    }`
    }]}],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          investigation: { type: Type.STRING },
          improvementPlan: { type: Type.STRING },
          epsNotificationLetter: { type: Type.STRING }
        },
        required: ["investigation", "improvementPlan", "epsNotificationLetter"]
      }
    }
  });

  return JSON.parse(result.text ?? "{}");
}

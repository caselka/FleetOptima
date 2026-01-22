
import { GoogleGenAI, Type } from "@google/genai";
import { DriverStats, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFleetPerformance = async (stats: DriverStats[]): Promise<AnalysisResult> => {
  const prompt = `
    Analyze the following driver performance data for a logistics operation based in Erskine Park.
    The customer wants to know:
    1. How drivers performed against the plan.
    2. Room for improvement in planning (e.g., gaps between loads, sequence efficiency).
    3. Notable bottlenecks.

    Data Summary:
    ${JSON.stringify(stats.map(s => ({
      driver: s.driverName,
      loadsCount: s.loads.length,
      totalKms: s.totalKms,
      avgGapMinutes: s.avgTimeBetweenLoadsMinutes,
      routes: s.loads.map(l => l.routeNo)
    })), null, 2)}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          efficiencyScore: { type: Type.NUMBER, description: "A score from 0-100 representing overall operational efficiency." },
          bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          summary: { type: Type.STRING, description: "A concise summary of the performance findings." }
        },
        required: ["efficiencyScore", "bottlenecks", "recommendations", "summary"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const getStoreLocationInfo = async (storeName: string) => {
  // Utilizing Maps grounding to get specific insights about locations if needed
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Tell me about the Woolworths location at ${storeName}. Is it a large supermarket or a metro? What are the typical delivery constraints?`,
    config: {
      tools: [{ googleMaps: {} }]
    }
  });
  return response.text;
};

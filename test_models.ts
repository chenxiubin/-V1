import { GoogleGenAI } from '@google/genai';
async function test() {
  const ai = new GoogleGenAI({ apiKey: 'x' });
  const models = await ai.models.list();
  for await (const m of models) {}
}

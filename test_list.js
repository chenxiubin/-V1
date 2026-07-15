import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function main() {
  const response = await ai.models.list();
  for await (const m of response) {
    console.log(JSON.stringify(m, null, 2));
    break;
  }
}
main().catch(console.error);

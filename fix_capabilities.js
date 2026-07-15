const fs = require('fs');
let code = fs.readFileSync('src/config/geminiModelCapabilities.ts', 'utf-8');

code = code.replace(
  /export interface GeminiModelCapability \{/,
  "export interface GeminiModelCapability {\n  id: string;\n  imageInput: boolean;\n  structuredOutput: boolean;\n  multimodalStatus: 'confirmed' | 'unknown';\n  releaseChannel: 'stable' | 'preview' | 'experimental' | 'unknown';\n"
);
// it already has these properties, wait.
// Let's just use string replace for the specific parts.

code = code.replace(
  "releaseChannel: 'stable' | 'preview' | 'experimental';",
  "releaseChannel: 'stable' | 'preview' | 'experimental' | 'unknown';"
);

const toAdd = `  'gemini-3.1-flash-lite': {
    imageInput: true,
    structuredOutput: true,
    multimodalStatus: 'confirmed',
    releaseChannel: 'stable'
  },
`;
code = code.replace("export const geminiModelCapabilities: Record<string, Omit<GeminiModelCapability, 'id'>> = {\n", "export const geminiModelCapabilities: Record<string, Omit<GeminiModelCapability, 'id'>> = {\n" + toAdd);

code = code.replace("releaseChannel: 'stable'\n  };\n}", "releaseChannel: 'unknown'\n  };\n}");

fs.writeFileSync('src/config/geminiModelCapabilities.ts', code);
console.log("Done");

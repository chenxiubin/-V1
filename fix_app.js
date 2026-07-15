const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// The exact string to remove
const targetStr = "{showModelCenter && <ModelCenterPanel onClose={() => setShowModelCenter(false)} />}";
const regex = new RegExp("\\{\\s*showModelCenter\\s*&&\\s*<ModelCenterPanel\\s*onClose=\\{.*?\\}\\s*/?>\\s*\\}", "g");

code = code.replace(regex, "");

// Find the last </ProjectProvider> or </main> or just before the last </>
// Wait, looking at App.tsx, the root might be returning a fragment <>.
// Let's just find the last closing tag of the main component return.
// Better: replace the final `  </>` with `    {showModelCenter && <ModelCenterPanel onClose={() => setShowModelCenter(false)} />}\n  </>`
const finalTag = "  </>\n  );\n}";
if (code.includes(finalTag)) {
  code = code.replace(finalTag, "    {showModelCenter && <ModelCenterPanel onClose={() => setShowModelCenter(false)} />}\n  </>\n  );\n}");
} else {
  // Try another common pattern
  const finalTag2 = "</>\n  );\n}";
  if (code.includes(finalTag2)) {
    code = code.replace(finalTag2, "  {showModelCenter && <ModelCenterPanel onClose={() => setShowModelCenter(false)} />}\n</>\n  );\n}");
  } else {
    console.log("Could not find the end of App component to insert the panel.");
  }
}

fs.writeFileSync('src/App.tsx', code);
console.log("Done");

const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace(
  /let persistedOverlay = 'OVR_REF';\n\s*if \(overlayPreviewRef && overlayPreviewRef\.startsWith\('data:'\)\) \{\n\s*const res = await fetch\(overlayPreviewRef\);\n\s*const blob = await res\.blob\(\);\n\s*const file = new File\(\[blob\], `overlay-\$\{Date\.now\(\)\}\.png`, \{ type: 'image\/png' \}\);\n\s*persistedOverlay = await saveAsset\(file\);\n\s*\}/,
  ""
);

app = app.replace(
  /overlayPreviewRef: persistedOverlay,/,
  "overlayPreviewRef,"
);

fs.writeFileSync('src/App.tsx', app);

async function run() {
  const payload = {
    productAssetId: "p1",
    productProfileSnapshot: {schemaVersion: '1.0', productAssetId: 'p1', productType: 'unknown', bracketType: 'unknown', subjectBounds: {x:0,y:0,width:1,height:1}, contactRegion: {xStart:0,xEnd:1,y:0,confidence:'high'}, view: {class:'front',visibleTop:'none',visibleSide:'none',perspectiveStrength:'low'}, materials: [], palette: {dominant:[],edgeBrightness:'mid'}, existingLighting: {direction:'front',temperature:'neutral',softness:'soft',contrast:'low'}, uncertainties: [], overallConfidence: 'high', analyzedAt: '2026-07-15T00:00:00.000Z' },
    guidedQuestions: [],
    guidedAnswers: [],
    sceneDirections: [{id: "dir-nordic", spaceType: "unknown", desktop: "unknown", palette: [], lightingSummary: "unknown", compositionSummary: "unknown", decorationSummary: "unknown", risks: []}],
    selectedDirectionId: "dir-nordic"
  };
  const start = Date.now();
  try {
    const res = await fetch("http://localhost:3000/api/ai/scene-recipe", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Duration:", Date.now() - start, "ms");
    console.log("Response:", JSON.stringify(data).substring(0, 300) + "...");
  } catch (e) {
    console.error("Error:", e);
  }
}
run();

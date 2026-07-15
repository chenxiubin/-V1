async function run() {
  try {
    const form = new FormData();
    form.append('productAssetId', '1234');
    form.append('productImage', new Blob(['fakeimage'], { type: 'image/png' }), 'test.png');

    const res = await fetch("http://localhost:3000/api/ai/analyze-product", {
      method: 'POST',
      body: form
    });
    console.log("Analyze Status:", res.status);
    console.log("Analyze Content-Type:", res.headers.get("content-type"));
    console.log("Analyze Redirected:", res.redirected);
    console.log("Analyze Redirect URL:", res.url);
    const text = await res.text();
    console.log("Analyze Response (120 chars):", text.substring(0, 120).replace(/\n/g, '\\n'));
  } catch (e) {
    console.error("Analyze fetch error:", e);
  }
}
run();

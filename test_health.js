async function run() {
  try {
    const res = await fetch("http://localhost:3000/api/health");
    console.log("Health Status:", res.status);
    console.log("Health Content-Type:", res.headers.get("content-type"));
    console.log("Health Redirected:", res.redirected);
    const text = await res.text();
    console.log("Health Response (120 chars):", text.substring(0, 120));
  } catch (e) {
    console.error("Health fetch error:", e);
  }
}
run();

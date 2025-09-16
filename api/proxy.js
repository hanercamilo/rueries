// api/proxy.js
export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing url param" });
  }

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        ...req.headers,
        host: undefined,
      },
      body: req.method !== "GET" && req.method !== "HEAD" ? req.body : undefined,
    });

    const text = await response.text();
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(response.status).send(text);
  } catch (error) {
    res.status(500).json({ error: "Proxy error", details: error.message });
  }
}

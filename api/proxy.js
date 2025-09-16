export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: "Missing url param" });
  }

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        ...req.headers, // 🔥 reenvía los headers que mandó tu cliente
        host: undefined, // evita problemas con el header `host`
      },
      body:
        req.method !== "GET" && req.method !== "HEAD"
          ? JSON.stringify(req.body)
          : undefined,
    });

    const contentType = response.headers.get("content-type");
    const contentEncoding = response.headers.get("content-encoding");
    const buffer = await response.arrayBuffer(); // soporta JSON, binarios, etc.

    res.setHeader("Access-Control-Allow-Origin", "*");
    if (contentType) res.setHeader("Content-Type", contentType);
if (contentEncoding) res.setHeader("Content-Encoding", contentEncoding);

    res.status(response.status).send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ error: "Proxy error", details: error.message });
  }
}

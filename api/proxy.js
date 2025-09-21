import { URL } from "url";

export default async function handler(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: "Missing url param" });

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
  const acrh = req.headers["access-control-request-headers"];
  res.setHeader("Access-Control-Allow-Headers", acrh || "*");
  res.setHeader("Access-Control-Expose-Headers", "Content-Type, Content-Encoding, Content-Length");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const hopByHop = new Set([
      "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
      "te", "trailer", "transfer-encoding", "upgrade", "host"
    ]);

    const forwardedHeaders = {};
    for (const [k, v] of Object.entries(req.headers || {})) {
      const kl = k.toLowerCase();
      if (!hopByHop.has(kl)) forwardedHeaders[k] = v;
    }

    // 👇 Forzar Host correcto según el destino
    const urlObj = new URL(targetUrl);
    forwardedHeaders["host"] = urlObj.host;

    // 👇 Forzar User-Agent estilo Postman (para evitar bloqueos WAF)
    if (!forwardedHeaders["user-agent"]) {
      forwardedHeaders["user-agent"] = "PostmanRuntime/7.46.1";
    }

    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardedHeaders,
      body: req.method !== "GET" && req.method !== "HEAD"
        ? JSON.stringify(req.body || {})
        : undefined,
    });

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type");
    const contentEncoding = response.headers.get("content-encoding");
    const contentLength = response.headers.get("content-length");

    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentEncoding) res.setHeader("Content-Encoding", contentEncoding);
    if (contentLength) res.setHeader("Content-Length", contentLength);

    res.status(response.status).send(Buffer.from(buffer));
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(502).json({ error: "Proxy error", details: String(err.message || err) });
  }
}

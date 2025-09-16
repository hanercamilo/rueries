// api/proxy.js
export default async function handler(req, res) {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: "Missing url param" });

  // CORS básico + preflight handling (antes de hacer fetch)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS");
  // Reflejar headers solicitados por el navegador en el preflight (más compatible que '*')
  const acrh = req.headers["access-control-request-headers"];
  if (acrh) {
    res.setHeader("Access-Control-Allow-Headers", acrh);
  } else {
    res.setHeader("Access-Control-Allow-Headers", "*");
  }
  // Exponer headers útiles al cliente
  res.setHeader("Access-Control-Expose-Headers", "Content-Type, Content-Encoding, Content-Length");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    // Eliminar headers hop-by-hop que no deberían reenviarse
    const hopByHop = new Set([
      "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
      "te", "trailer", "transfer-encoding", "upgrade", "host"
    ]);

    const forwardedHeaders = {};
    for (const [k, v] of Object.entries(req.headers || {})) {
      const kl = k.toLowerCase();
      if (!hopByHop.has(kl)) forwardedHeaders[k] = v;
    }

    // Leer body crudo (si no está ya en req.body)
    let requestBody;
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.body && Object.keys(req.body).length !== 0) {
        // Vercel/Next puede traer req.body parseado
        requestBody = typeof req.body === "string" || Buffer.isBuffer(req.body)
          ? req.body
          : JSON.stringify(req.body);
      } else {
        // fallback: leer stream bruto
        requestBody = await new Promise((resolve, reject) => {
          const chunks = [];
          req.on("data", (c) => chunks.push(Buffer.from(c)));
          req.on("end", () => resolve(Buffer.concat(chunks)));
          req.on("error", reject);
        });
      }
    }

    // Hacer la petición al destino (sin forzar accept-encoding para poder preservar compresión)
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: forwardedHeaders,
      body: requestBody,
    });

    // Tomar la respuesta como arrayBuffer para no romper binarios
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type");
    const contentEncoding = response.headers.get("content-encoding");
    const contentLength = response.headers.get("content-length");

    // Reenviar headers relevantes al cliente
    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentEncoding) res.setHeader("Content-Encoding", contentEncoding);
    if (contentLength) res.setHeader("Content-Length", contentLength);

    res.status(response.status).send(Buffer.from(buffer));
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(502).json({ error: "Proxy error", details: String(err.message || err) });
  }
}

export default async function handler(req, res) {
    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: "Missing url param" });
    }

    // 🔥 Siempre configurar CORS primero
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

    // 🔥 Si es preflight, respondemos sin hacer fetch
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    try {
        const response = await fetch(url, {
            method: req.method,
            headers: {
                ...req.headers,
                host: undefined,
            },
            body:
                req.method !== "GET" && req.method !== "HEAD"
                    ? JSON.stringify(req.body)
                    : undefined,
        });

        const contentType = response.headers.get("content-type");
        const contentEncoding = response.headers.get("content-encoding");
        const buffer = await response.arrayBuffer();

        if (contentType) res.setHeader("Content-Type", contentType);
        if (contentEncoding) res.setHeader("Content-Encoding", contentEncoding);

        res.status(response.status).send(Buffer.from(buffer));
    } catch (error) {
        res.status(500).json({ error: "Proxy error", details: error.message });
    }
}

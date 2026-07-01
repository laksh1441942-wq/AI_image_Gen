const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const port = Number(process.env.PORT) || 3000;
const modelProviders = new Map([
    ["black-forest-labs/FLUX.1-schnell", "hf-inference"],
    ["black-forest-labs/FLUX.1-dev", "fal-ai"],
    ["black-forest-labs/FLUX.1-Krea-dev", "fal-ai"],
    ["ideogram-ai/ideogram-4-fp8", "fal-ai"],
]);

function loadEnv() {
    const envPath = path.join(root, ".env");
    if (!fs.existsSync(envPath)) return;

    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match || process.env[match[1]]) continue;
        process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
}

loadEnv();

function sendJson(response, status, body) {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
}

async function generateImage(request, response) {
    let body = "";
    for await (const chunk of request) {
        body += chunk;
        if (body.length > 100_000) return sendJson(response, 413, { error: "Request is too large" });
    }

    try {
        const { model, prompt, width, height } = JSON.parse(body);
        if (!modelProviders.has(model) || !prompt) {
            return sendJson(response, 400, { error: "A valid model and prompt are required" });
        }
        if (!process.env.HF_TOKEN) {
            return sendJson(response, 500, { error: "HF_TOKEN is missing from .env" });
        }

        const { InferenceClient } = await import("@huggingface/inference");
        const client = new InferenceClient(process.env.HF_TOKEN);
        const image = await client.textToImage({
            model,
            provider: modelProviders.get(model),
            inputs: prompt,
            parameters: { width, height },
        });

        response.writeHead(200, {
            "Content-Type": image.type || "image/png",
            "Cache-Control": "no-store",
        });
        response.end(Buffer.from(await image.arrayBuffer()));
    } catch (error) {
        sendJson(response, 500, { error: error.message || "Unexpected server error" });
    }
}

function serveFile(request, response) {
    const pathname = request.url === "/" ? "/index.html" : request.url.split("?")[0];
    const filePath = path.resolve(root, `.${pathname}`);
    if (!filePath.startsWith(`${root}${path.sep}`)) return sendJson(response, 403, { error: "Forbidden" });

    const contentTypes = {
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
    };

    fs.readFile(filePath, (error, data) => {
        if (error) return sendJson(response, 404, { error: "Not found" });
        response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream" });
        response.end(data);
    });
}

http.createServer((request, response) => {
    if (request.method === "POST" && request.url === "/api/generate") {
        return generateImage(request, response);
    }
    if (request.method === "GET") return serveFile(request, response);
    sendJson(response, 405, { error: "Method not allowed" });
}).listen(port, () => {
    console.log(`AI image generator running at http://localhost:${port}`);
});

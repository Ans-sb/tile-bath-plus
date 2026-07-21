const DEFAULT_BODY_LIMIT = 80 * 1024 * 1024;

function readRequestBody(request, options = {}) {
  const bodyLimit = Number(options.bodyLimit || DEFAULT_BODY_LIMIT);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > bodyLimit) {
        reject(new Error("업로드 용량이 너무 큽니다."));
        request.destroy();
        return;
      }

      chunks.push(chunk);
    });

    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    request.on("error", reject);
  });
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

function sendRawJson(response, status, json) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(json);
}

module.exports = {
  DEFAULT_BODY_LIMIT,
  readRequestBody,
  sendJson,
  sendRawJson
};

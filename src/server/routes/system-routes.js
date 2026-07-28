async function handleSystemRoutes(request, response, context) {
  if (request.method === "GET" && request.url === "/api/health") {
    context.sendJson(response, 200, {
      ok: true,
      status: "online",
      storage: context.getStorageMode(),
      startedAt: context.startedAt.toISOString(),
      uptimeSeconds: Math.floor(process.uptime())
    });
    return true;
  }

  if (request.method === "GET" && request.url.startsWith("/api/social-auth/start")) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const redirect = context.startSocialAuth(
        String(url.searchParams.get("provider") || ""),
        String(url.searchParams.get("mode") || "signup"),
        request
    );
    const headers = { Location: redirect.location };
    if (redirect.setCookie) headers["Set-Cookie"] = redirect.setCookie;
    response.writeHead(302, headers);
    response.end();
    return true;
  }

  if (
    request.method === "GET"
    && (
      request.url.startsWith("/api/social-auth/naver/callback")
      || request.url.startsWith("/api/auth/naver/callback")
    )
  ) {
    let redirect;
    try {
      redirect = await context.completeNaverSocialAuth(request);
    } catch (error) {
      redirect = context.buildNaverSocialAuthErrorRedirect(request, error);
    }
    response.writeHead(302, {
      Location: redirect.location,
      "Set-Cookie": redirect.setCookie
    });
    response.end();
    return true;
  }

  if (request.method === "POST" && request.url === "/api/social-auth/profile") {
    const payload = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.readSocialAuthProfile(String(payload?.accessToken || "")));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/social-auth/login") {
    const payload = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.loginWithSocialAuth(String(payload?.accessToken || "")));
    return true;
  }

  return false;
}

module.exports = {
  handleSystemRoutes
};

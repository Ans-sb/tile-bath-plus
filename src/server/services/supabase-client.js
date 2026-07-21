function createSupabaseClient(options = {}) {
  const supabaseUrl = String(options.supabaseUrl || "").trim().replace(/\/+$/, "");
  const supabaseSecretKey = String(options.supabaseSecretKey || "").trim();
  const defaultTimeoutMs = Math.max(0, Number(options.defaultTimeoutMs || 12000));

  function hasConfig() {
    return Boolean(supabaseUrl && supabaseSecretKey);
  }

  function assertConfig() {
    if (!hasConfig()) {
      throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
    }
  }

  async function request(pathname, requestOptions = {}) {
    assertConfig();

    const timeoutMs = Number(requestOptions.timeoutMs ?? defaultTimeoutMs);
    const controller = timeoutMs > 0 ? new AbortController() : null;
    const timeout = controller
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
    let response;

    try {
      response = await fetch(`${supabaseUrl}${pathname}`, {
        method: requestOptions.method || "GET",
        headers: {
          apikey: supabaseSecretKey,
          Authorization: `Bearer ${supabaseSecretKey}`,
          "Content-Type": "application/json",
          ...(requestOptions.headers || {})
        },
        body: requestOptions.body,
        signal: controller?.signal
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new Error(`Supabase 요청 시간 초과 (${timeoutMs}ms)`);
      }
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase 요청 오류 (${response.status}): ${text}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return null;
    return response.json();
  }

  async function requestStorage(pathname, requestOptions = {}) {
    assertConfig();

    const response = await fetch(`${supabaseUrl}${pathname}`, {
      method: requestOptions.method || "GET",
      headers: {
        apikey: supabaseSecretKey,
        Authorization: `Bearer ${supabaseSecretKey}`,
        ...(requestOptions.headers || {})
      },
      body: requestOptions.body
    });

    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    let payload = text;
    if (contentType.includes("application/json") && text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    if (!response.ok) {
      const message = typeof payload === "string" ? payload : JSON.stringify(payload);
      const error = new Error(`Supabase Storage 요청 오류 (${response.status}): ${message}`);
      error.statusCode = response.status;
      error.payload = payload;
      throw error;
    }

    return payload || null;
  }

  return {
    hasConfig,
    request,
    requestStorage
  };
}

module.exports = {
  createSupabaseClient
};

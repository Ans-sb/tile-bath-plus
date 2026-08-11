async function handleAccountRoutes(request, response, context) {
  if (request.method === "GET" && request.url === "/api/approval-rules") {
    context.sendJson(response, 200, await context.readApprovalRules());
    return true;
  }


  if (request.method === "POST" && request.url === "/api/signup-requests") {
    if (context.allowSignupRequest && !context.allowSignupRequest(request)) {
      context.sendJson(response, 429, { error: "가입 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
      return true;
    }
    const payload = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.saveSignupRequestRecord(payload));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/login") {
    if (context.allowLoginRequest && !context.allowLoginRequest(request)) {
      context.sendJson(response, 429, { error: "로그인 시도가 너무 많습니다. 15분 후 다시 시도해주세요." });
      return true;
    }
    const payload = JSON.parse(await context.readRequestBody(request));
    context.sendJson(response, 200, await context.loginWithSignupRequest(payload));
    return true;
  }

  if (request.method === "GET" && request.url.startsWith("/api/cart")) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const memberCredentials = context.readMemberProductCredentialsFromRequest(request);
    const businessNumber = String(url.searchParams.get("businessNumber") || memberCredentials.businessNumber || "");
    await context.verifyMemberSessionAccess(businessNumber, memberCredentials.memberToken);
    context.sendJson(response, 200, await context.readCartRecord(businessNumber));
    return true;
  }

  if (request.method === "PUT" && request.url === "/api/cart") {
    const payload = JSON.parse(await context.readRequestBody(request));
    const memberCredentials = context.readMemberProductCredentialsFromRequest(request);
    const businessNumber = String(payload?.businessNumber || memberCredentials.businessNumber || "");
    await context.verifyMemberSessionAccess(businessNumber, memberCredentials.memberToken);
    context.sendJson(response, 200, await context.saveCartRecord(payload));
    return true;
  }

  if (request.method === "GET" && request.url.startsWith("/api/orders")) {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const memberCredentials = context.readMemberProductCredentialsFromRequest(request);
    context.sendJson(response, 200, await context.readMemberOrders(
      String(url.searchParams.get("businessNumber") || memberCredentials.businessNumber || ""),
      memberCredentials
    ));
    return true;
  }

  if (request.method === "POST" && request.url === "/api/orders") {
    if (context.allowOrderRequest && !context.allowOrderRequest(request)) {
      context.sendJson(response, 429, { error: "주문 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
      return true;
    }
    const payload = JSON.parse(await context.readRequestBody(request));
    const memberCredentials = context.readMemberProductCredentialsFromRequest(request);
    context.sendJson(response, 200, await context.createOrderFromCart(payload, memberCredentials));
    return true;
  }

  return false;
}

module.exports = {
  handleAccountRoutes
};

const test = require("node:test");
const assert = require("node:assert/strict");

const { createHermesAdminService } = require("../../../src/server/features/hermes/hermes-admin-service");

test("status reports not_configured without calling Hermes", async () => {
  let healthCalls = 0;
  const service = createHermesAdminService({
    hermesClient: {
      hasConfig: () => false,
      health: async () => {
        healthCalls += 1;
      }
    }
  });

  assert.deepEqual(await service.readStatus(), {
    ok: true,
    configured: false,
    connected: false,
    status: "not_configured"
  });
  assert.equal(healthCalls, 0);
});

test("status returns health data for a configured Hermes client", async () => {
  const service = createHermesAdminService({
    hermesClient: {
      hasConfig: () => true,
      health: async () => ({ configured: true, connected: true, status: "ok" })
    }
  });

  assert.deepEqual(await service.readStatus(), {
    ok: true,
    configured: true,
    connected: true,
    status: "ok"
  });
});

test("status converts health failures into an unavailable result", async () => {
  const service = createHermesAdminService({
    hermesClient: {
      hasConfig: () => true,
      health: async () => {
        throw new Error("connection refused");
      }
    }
  });

  assert.deepEqual(await service.readStatus(), {
    ok: false,
    configured: true,
    connected: false,
    status: "unavailable",
    error: "connection refused"
  });
});

test("connection test normalizes the message and uses the internal Korean prompt", async () => {
  let request;
  const service = createHermesAdminService({
    hermesClient: {
      hasConfig: () => true,
      chat: async (payload) => {
        request = payload;
        return { connected: true, reply: "정상입니다." };
      }
    }
  });

  assert.deepEqual(await service.testConnection({ message: "  연결 확인  " }), {
    ok: true,
    connected: true,
    reply: "정상입니다."
  });
  assert.deepEqual(request, {
    message: "연결 확인",
    systemPrompt: "당신은 자재GO 내부 운영 보조 AI입니다. 한국어로 짧고 명확하게 답하세요."
  });
});

test("connection test uses the default message when the message is omitted or empty", async () => {
  const messages = [];
  const service = createHermesAdminService({
    hermesClient: {
      hasConfig: () => true,
      chat: async ({ message }) => {
        messages.push(message);
        return { connected: true };
      }
    }
  });

  await service.testConnection();
  await service.testConnection({ message: "" });

  assert.deepEqual(messages, [
    "자재GO Hermes 연결 상태를 한 문장으로 확인해 주세요.",
    "자재GO Hermes 연결 상태를 한 문장으로 확인해 주세요."
  ]);
});

test("connection test converts non-string messages and limits them to 1000 characters", async () => {
  const messages = [];
  const service = createHermesAdminService({
    hermesClient: {
      hasConfig: () => true,
      chat: async ({ message }) => {
        messages.push(message);
        return { connected: true };
      }
    }
  });

  await service.testConnection({ message: 12345 });
  await service.testConnection({ message: `  ${"가".repeat(1200)}  ` });

  assert.equal(messages[0], "12345");
  assert.equal(messages[1].length, 1000);
  assert.equal(messages[1], "가".repeat(1000));
});

import { Logger } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { UserAuthenticationGuard } from "./user-authentication.guard";

describe("UserAuthenticationGuard", () => {
  const secret = "guard-spec-secret-padding-00032b";
  const password = "stored-password-hash";
  const bearer = "client-bearer-token";
  let logs: string[];

  beforeEach(() => {
    process.env.JWT_SECRET = secret;
    logs = [];
    const record = (message: unknown) => {
      logs.push(typeof message === "string" ? message : JSON.stringify(message));
    };
    jest.spyOn(Logger, "log").mockImplementation(record);
    jest.spyOn(Logger, "error").mockImplementation(record);
    jest.spyOn(Logger, "warn").mockImplementation(record);
    jest.spyOn(Logger, "verbose").mockImplementation(record);
    jest.spyOn(Logger, "debug").mockImplementation(record);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function guardFor(username: string) {
    const registration = {
      findRegistration: jest.fn(async (name: string) => ({
        id: "user-1",
        username: name,
        password,
        token: bearer
      }))
    };
    return new UserAuthenticationGuard(registration as never);
  }

  function httpContext(authorization?: string) {
    const request: { headers: { authorization?: string }; user?: unknown } = {
      headers: {}
    };
    if (authorization !== undefined) {
      request.headers.authorization = authorization;
    }
    return {
      switchToHttp: () => ({
        getRequest: () => request
      })
    };
  }

  function signed(payload: Record<string, unknown>, signingSecret = secret) {
    return jwt.sign(payload, signingSecret);
  }

  it("does not log the password hash or the bearer token", async () => {
    const token = signed({ id: "user-1", username: "ada" });
    const guard = guardFor("ada");
    await guard.canActivate(httpContext(`Bearer ${token}`) as never);
    const written = logs.join("\n");
    expect(written).not.toContain(password);
    expect(written).not.toContain(bearer);
    expect(written).not.toContain(token);
  });

  it("rejects an expired token with 401", async () => {
    const token = signed({
      id: "user-1",
      username: "ada",
      exp: Math.floor(Date.now() / 1000) - 60
    });
    const guard = guardFor("ada");
    await expect(guard.canActivate(httpContext(`Bearer ${token}`) as never)).rejects.toMatchObject({
      message: expect.stringContaining("expired"),
      status: 401
    });
  });

  it("rejects a bad signature with 403", async () => {
    const token = signed({ id: "user-1", username: "ada" }, "other-secret");
    const guard = guardFor("ada");
    await expect(guard.canActivate(httpContext(`Bearer ${token}`) as never)).rejects.toMatchObject({
      status: 403
    });
  });
});

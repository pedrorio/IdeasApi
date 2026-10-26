import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import * as jwt from "jsonwebtoken";

import { UserAuthenticationRegistrationService } from "./registration/user-authentication-registration.service";
import { UserAuthenticationRO } from "./user-authentication.ro";
import { jwtSecret } from "../../app.constants";

interface GraphQLAuthContext {
  request: { headers: { authorization?: string } };
  user?: UserAuthenticationRO;
}

function isTokenExpired(error: unknown): boolean {
  return error instanceof Error && error.name === "TokenExpiredError";
}

function usernameFromPayload(value: unknown): string {
  if (typeof value === "object" && value !== null && "username" in value && typeof value.username === "string") {
    return value.username;
  }
  throw new HttpException("Token error: invalid payload", HttpStatus.FORBIDDEN);
}

@Injectable()
export class UserAuthenticationGuard implements CanActivate {
  constructor(private userAuthenticationRegistrationService: UserAuthenticationRegistrationService) {
  }

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let user;

    if (request) {
      if (!request.headers.authorization) {
        return false;
      }

      const payload = await this.validateToken(request.headers.authorization);
      user = await this.userAuthenticationRegistrationService.findRegistration(payload.username);

      request.user = user;

      return true;

    } else {
      const ctx = GqlExecutionContext.create(context).getContext<GraphQLAuthContext>();
      if (!ctx.request.headers.authorization) {
        return false;
      }

      const payload = await this.validateToken(ctx.request.headers.authorization);
      user = await this.userAuthenticationRegistrationService.findRegistration(payload.username);

      ctx.user = user;

      return true;
    }

    return false;

  }

  async validateToken(auth: string) {
    if (auth.split(" ")[0] !== "Bearer") {
      throw new HttpException(
        "Invalid Token",
        HttpStatus.FORBIDDEN
      );
    }

    const token = auth.split(" ")[1];
    try {
      const decodedToken: unknown = jwt.verify(token, process.env.JWT_SECRET || jwtSecret, {
        algorithms: ["HS256"]
      });
      return { username: usernameFromPayload(decodedToken) };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (isTokenExpired(error)) {
        throw new HttpException(
          "Token expired",
          HttpStatus.UNAUTHORIZED
        );
      }
      const message = error instanceof Error ? error.message : "invalid token";
      throw new HttpException(
        `Token error: ${message}`,
        HttpStatus.FORBIDDEN
      );
    }
  }

}

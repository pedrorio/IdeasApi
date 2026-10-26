import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import * as jwt from "jsonwebtoken";

import { UserAuthenticationRegistrationService } from "./registration/user-authentication-registration.service";
import { jwtSecret } from "../../app.constants";

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

      user = await this.validateToken(request.headers.authorization);
      user = await this.userAuthenticationRegistrationService.findRegistration(user.username);

      request.user = user;

      return true;

    } else {
      const ctx: any = GqlExecutionContext.create(context).getContext();
      if (!ctx.request.headers.authorization) {
        return false;
      }

      user = await this.validateToken(ctx.request.headers.authorization);
      user = await this.userAuthenticationRegistrationService.findRegistration(user.username);

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
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET || jwtSecret);
      return decodedToken;
    } catch (error) {
      if (error && error.name === "TokenExpiredError") {
        throw new HttpException(
          "Token expired",
          HttpStatus.UNAUTHORIZED
        );
      }
      const message = `Token error: ${error.message || error.name}`;
      throw new HttpException(
        message,
        HttpStatus.FORBIDDEN
      );
    }
  }

}

import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { jwtSecret } from "../config/constants";

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!request.headers.authorization) {
      return false;
    }

    request.user = await this.validateToken(request.headers.authorization);

    return true;
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
      const decodedToken = jwt.verify(token, jwtSecret);
      return decodedToken;
    } catch (error) {
      const message = `Token error: ${error.message || error.name}`;
      throw new HttpException(
        message,
        HttpStatus.FORBIDDEN
      );

    }
  }
}

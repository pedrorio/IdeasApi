import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { GqlExecutionContext } from "@nestjs/graphql";

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Observable<any> {
    const call$ = next.handle();
    const request = context.switchToHttp().getRequest();
    const now = Date.now();

    if (request) {

      const { method, url } = request;

      return call$.pipe(
        tap(() => Logger.log(
          `${method} ${url} ${Date.now() - now}ms`,
          context.getClass().name
        ))
      );

    } else {

      const ctx: any = GqlExecutionContext.create(context);

      const resolverName = ctx.constructorRef.name;
      const info = ctx.getInfo();

      return call$.pipe(
        tap(() => Logger.log(
          `${info.parentType} ${info.fieldName} ${Date.now() - now}ms`,
          resolverName
        ))
      );

      return call$;
    }

  }
}

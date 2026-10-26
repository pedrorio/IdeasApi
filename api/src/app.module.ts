import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";

import { Module } from "@nestjs/common";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLFormattedError } from "graphql";

import { ValidatorPipe } from "./shared/validator.pipe";
import { LoggerInterceptor } from "./shared/logger.interceptor";
import { HttpErrorExceptionFilter } from "./shared/http-error.filter";

import { UserModule } from "./user/user.module";
import { IdeaModule } from "./idea/idea.module";
import { CommentModule } from "./comment/comment.module";

import { DateScalar } from "./shared/date.scalar";

const [connection] = require("../ormconfig") as Array<TypeOrmModuleOptions & { cli?: unknown }>;
const { cli: _typeOrmCli, ...typeOrmOptions } = connection;

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmOptions),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      typePaths: ["./**/*.graphql"],
      context: ({ req }) => ({ request: req }),
      // Apollo Server 4 blocks GET by default. Apollo Server 2 accepted it.
      csrfPrevention: false,
      // Apollo Server 4 puts stack frames on extensions.stacktrace.
      // Apollo Server 2 nested them under extensions.exception.stacktrace.
      formatError: (formattedError: GraphQLFormattedError): GraphQLFormattedError => {
        const extensions = formattedError.extensions;
        const stacktrace = extensions && extensions.stacktrace;
        if (!extensions || !Array.isArray(stacktrace)) {
          return formattedError;
        }
        const { stacktrace: _ignored, ...rest } = extensions;
        return {
          ...formattedError,
          extensions: {
            ...rest,
            exception: { stacktrace }
          }
        };
      }
    }),
    IdeaModule,
    UserModule,
    CommentModule
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ValidatorPipe
    },
    {
      provide: APP_FILTER,
      useClass: HttpErrorExceptionFilter
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggerInterceptor
    },
    DateScalar
  ],
})
export class AppModule {
}

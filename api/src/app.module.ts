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

function formatGraphQLError(formattedError: GraphQLFormattedError): GraphQLFormattedError {
  const extensions = formattedError.extensions;
  if (!extensions) {
    return formattedError;
  }
  if (process.env.NODE_ENV === "development") {
    return copyDevelopmentStack(formattedError, extensions);
  }
  return stripErrorStack(formattedError, extensions);
}

function copyDevelopmentStack(
  formattedError: GraphQLFormattedError,
  extensions: Record<string, unknown>
): GraphQLFormattedError {
  const stacktrace = extensions.stacktrace;
  if (!Array.isArray(stacktrace)) {
    return formattedError;
  }
  const rest: Record<string, unknown> = {};
  for (const key of Object.keys(extensions)) {
    if (key !== "stacktrace") {
      rest[key] = extensions[key];
    }
  }
  return {
    ...formattedError,
    extensions: {
      ...rest,
      exception: { stacktrace }
    }
  };
}

function stripErrorStack(
  formattedError: GraphQLFormattedError,
  extensions: Record<string, unknown>
): GraphQLFormattedError {
  if (!Object.prototype.hasOwnProperty.call(extensions, "stacktrace")
    && !Object.prototype.hasOwnProperty.call(extensions, "exception")) {
    return formattedError;
  }
  const rest: Record<string, unknown> = {};
  for (const key of Object.keys(extensions)) {
    if (key !== "stacktrace" && key !== "exception") {
      rest[key] = extensions[key];
    }
  }
  return {
    ...formattedError,
    extensions: rest
  };
}

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
      // Outside development those frames are omitted.
      formatError: formatGraphQLError
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

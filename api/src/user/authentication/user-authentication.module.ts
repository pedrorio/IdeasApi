import { Module } from "@nestjs/common";
import { UserAuthenticationRegistrationModule } from "./registration/user-authentication-registration.module";
import { UserAuthenticationSessionModule } from "./session/user-authentication-session.module";

@Module({
  imports: [
    UserAuthenticationRegistrationModule,
    UserAuthenticationSessionModule
  ],
  // Nest 12 resolves a guard in the module that declares the route.
  // Re-export the registration service those guards inject. Nest 5 looked
  // the same provider up across modules, so this was unnecessary then.
  exports: [
    UserAuthenticationRegistrationModule
  ]
})
export class UserAuthenticationModule {}

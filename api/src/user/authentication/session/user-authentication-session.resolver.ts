import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { UserDTO } from "../../user.dto";
import { UserAuthenticationSessionService } from "./user-authentication-session.service";
import { UserAuthenticationRO } from "../user-authentication.ro";
import { UserAuthenticationGuard } from "../user-authentication.guard";
import { UserService } from "../../user.service";

@Resolver("User")
export class UserAuthenticationSessionResolver {

  constructor(
    private userAuthenticationSessionService: UserAuthenticationSessionService,
    private userService: UserService
  ) {}

  @Mutation()
  loginUser(@Args("data") data: UserDTO) {
    return this.userAuthenticationSessionService.createSession(data);
  }

  @Query()
  @UseGuards(UserAuthenticationGuard)
  findMe(
    @Context("user") user: UserAuthenticationRO
  ) {
    return this.userService.findUser(user.username);
  }

}

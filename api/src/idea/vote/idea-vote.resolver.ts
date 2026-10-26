import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { UserAuthenticationGuard } from "../../user/authentication/user-authentication.guard";
import { UserAuthenticationRO } from "../../user/authentication/user-authentication.ro";
import { IdeaVoteService } from "./idea-vote.service";

@Resolver()
export class IdeaVoteResolver {
  constructor(private ideaVoteService: IdeaVoteService) {
  }

  @Mutation()
  @UseGuards(UserAuthenticationGuard)
  setVote(
    @Args("ideaId") ideaId: string,
    @Args("value") value: number,
    @Context("user") user: UserAuthenticationRO
  ) {
    return this.ideaVoteService.setVote(ideaId, user.id, value);
  }
}

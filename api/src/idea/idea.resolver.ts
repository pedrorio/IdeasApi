import { Resolver, Query, Args, Mutation, Context } from "@nestjs/graphql";
import { IdeaService } from "./idea.service";
import { UserAuthenticationRO } from "../user/authentication/user-authentication.ro";
import { IdeaDTO } from "./idea.dto";
import { UseGuards } from "@nestjs/common";
import { UserAuthenticationGuard } from "../user/authentication/user-authentication.guard";

@Resolver("Idea")
export class IdeaResolver {

  constructor(private ideaService: IdeaService) {
  }

  @Query()
  ideas(@Args("cursor") cursor: string, @Args("limit") limit: number) {
    return this.ideaService.findIdeaPage(cursor, limit);
  }

  @Query()
  newestIdeas(@Args("cursor") cursor: string, @Args("limit") limit: number) {
    return this.ideaService.findIdeaPage(cursor, limit);
  }

  @Query()
  idea(@Args("id") id: string) {
    return this.ideaService.findIdea(id);
  }

  @Mutation()
  @UseGuards(UserAuthenticationGuard)
  createIdea(
    @Context("user") user: UserAuthenticationRO,
    @Args("data") data: IdeaDTO
  ) {
    const userId = user.id;
    return this.ideaService.createIdea(userId, data);
  }

  @Mutation()
  @UseGuards(UserAuthenticationGuard)
  updateIdea(
    @Context("user") user: UserAuthenticationRO,
    @Args("id") id: string,
    @Args("data") data: IdeaDTO
  ) {
    const userId = user.id;
    return this.ideaService.updateIdea(id, userId, data);
  }

  @Mutation()
  @UseGuards(UserAuthenticationGuard)
  deleteIdea(
    @Context("user") user: UserAuthenticationRO,
    @Args("id") id: string,
  ) {
    const userId = user.id;
    return this.ideaService.deleteIdea(id, userId);
  }

}

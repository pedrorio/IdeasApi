import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { IdeaEntity } from "../idea.entity";
import { VoteEntity } from "./vote.entity";
import { IdeaVoteService } from "./idea-vote.service";
import { IdeaVoteController } from "./idea-vote.controller";
import { IdeaVoteResolver } from "./idea-vote.resolver";
import { UserAuthenticationModule } from "../../user/authentication/user-authentication.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IdeaEntity,
      VoteEntity
    ]),
    UserAuthenticationModule
  ],
  controllers: [
    IdeaVoteController
  ],
  providers: [
    IdeaVoteService,
    IdeaVoteResolver
  ]
})
export class IdeaVoteModule {}

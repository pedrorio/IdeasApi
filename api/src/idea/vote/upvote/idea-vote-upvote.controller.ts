import { Controller, Logger, Param, Post, UseGuards } from "@nestjs/common";

import { IdeaVoteUpvoteService } from "./idea-vote-upvote.service";
import { User } from "../../../user/user.decorator";
import { UserAuthenticationGuard } from "../../../user/authentication/user-authentication.guard";
import { ApiTags, ApiForbiddenResponse, ApiOperation, ApiBearerAuth, ApiBadRequestResponse, ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse} from "@nestjs/swagger";

@Controller("ideas")
@ApiTags("Upvote Idea")
export class IdeaVoteUpvoteController {
  private logger = new Logger("IdeaVoteUpvoteController");

  constructor(private ideaVoteUpvoteService: IdeaVoteUpvoteService) {
  }

  private logData(options: any) {
    options.id && this.logger.log(`IDEA ${JSON.stringify(options.id)}`);
    options.data && this.logger.log(`DATA ${JSON.stringify(options.body)}`);
    options.userId && this.logger.log(`USER ${JSON.stringify(options.userId)}`);
  }

  @Post(":id/upvote")
  @UseGuards(UserAuthenticationGuard)
  @ApiOperation({ summary: "Upvote a specific idea." })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: "Invalid token or forbidden." })
  @ApiBadRequestResponse({ description: "Unable to cast vote." })
  @ApiNotFoundResponse({ description: "The specific idea was not found." })
  @ApiCreatedResponse({ description: "Upvoted the specific idea." })
  @ApiOkResponse({ description: "Deleted the existing downvote on the specific idea." })
  upvoteIdea(
    @Param("id") id: string,
    @User("id") userId: string
  ) {
    this.logData({ id, userId });
    return this.ideaVoteUpvoteService.upvoteIdea(id, userId);
  }

}

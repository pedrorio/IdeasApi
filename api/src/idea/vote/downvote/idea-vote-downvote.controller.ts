import { Controller, Logger, Param, Post, UseGuards } from "@nestjs/common";

import { IdeaVoteDownvoteService } from "./idea-vote-downvote.service";
import { User } from "../../../user/user.decorator";
import { UserAuthenticationGuard } from "../../../user/authentication/user-authentication.guard";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiForbiddenResponse, ApiBadRequestResponse, ApiNotFoundResponse,
  ApiCreatedResponse,
  ApiOkResponse} from "@nestjs/swagger";

@Controller("ideas")
@ApiTags("Downvote Idea")
export class IdeaVoteDownvoteController {
  private logger = new Logger("IdeaVoteDownvoteController");

  constructor(private ideaVoteDownvoteService: IdeaVoteDownvoteService) {}

  private logData(options: any) {
    options.id && this.logger.log(`IDEA ${JSON.stringify(options.id)}`);
    options.data && this.logger.log(`DATA ${JSON.stringify(options.body)}`);
    options.userId && this.logger.log(`USER ${JSON.stringify(options.userId)}`);
  }

  @Post(":id/downvote")
  @UseGuards(UserAuthenticationGuard)
  @ApiOperation({ summary: "Downvote a specific idea." })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: "Invalid token or forbidden." })
  @ApiBadRequestResponse({ description: "Unable to cast vote." })
  @ApiNotFoundResponse({ description: "The specific idea was not found." })
  @ApiCreatedResponse({ description: "Downvoted the specific idea." })
  @ApiOkResponse({ description: "Deleted the existing upvote on the specific idea." })
  downvoteIdea(
    @Param("id") id: string,
    @User("id") userId: string
  ) {
    this.logData({ id, userId });
    return this.ideaVoteDownvoteService.downvoteIdea(id, userId);
  }

}

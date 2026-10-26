import { Body, Controller, Param, Put, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import { User } from "../../user/user.decorator";
import { UserAuthenticationGuard } from "../../user/authentication/user-authentication.guard";
import { IdeaVoteService } from "./idea-vote.service";
import { SetVoteDTO } from "./set-vote.dto";

@Controller("ideas")
@ApiTags("Idea votes")
export class IdeaVoteController {
  constructor(private ideaVoteService: IdeaVoteService) {
  }

  @Put(":id/vote")
  @UseGuards(UserAuthenticationGuard)
  @ApiOperation({ summary: "Set the caller's vote on an idea." })
  @ApiBearerAuth()
  @ApiBody({ type: SetVoteDTO })
  @ApiOkResponse({ description: "Set the vote. The same value again does not change the score." })
  @ApiBadRequestResponse({ description: "value is missing or is not -1, 0, or 1." })
  @ApiNotFoundResponse({ description: "The idea was not found." })
  @ApiForbiddenResponse({ description: "Invalid token or forbidden." })
  setVote(
    @Param("id") id: string,
    @User("id") userId: string,
    @Body() body: SetVoteDTO
  ) {
    return this.ideaVoteService.setVote(id, userId, body.value);
  }
}

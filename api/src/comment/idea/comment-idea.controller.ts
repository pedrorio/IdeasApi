import { Body, Controller, Delete, Get, Logger, Param, Patch, Post, Query, UseGuards, UsePipes } from "@nestjs/common";
import { CommentIdeaService } from "./comment-idea.service";
import { ValidatorPipe } from "../../shared/validator.pipe";
import { UserAuthenticationGuard } from "../../user/authentication/user-authentication.guard";
import { User } from "../../user/user.decorator";
import { CommentDTO } from "../comment.dto";
import {
  ApiTags, ApiQuery, ApiOperation, ApiNotFoundResponse, ApiOkResponse, ApiForbiddenResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiBadRequestResponse
} from "@nestjs/swagger";

@Controller("ideas/:ideaId")
@ApiTags("Idea Comments")
export class CommentIdeaController {
  private logger = new Logger("CommentIdeaController");

  constructor(private commentIdeaService: CommentIdeaService) {
  }

  private logData(options: any) {
    options.commentId && this.logger.log(`COMMENT_ID ${JSON.stringify(options.commentId)}`);
    options.data && this.logger.log(`COMMENT_DATA ${JSON.stringify(options.body)}`);
    options.userId && this.logger.log(`USER_ID ${JSON.stringify(options.userId)}`);
    options.ideaId && this.logger.log(`IDEA_ID ${JSON.stringify(options.ideaId)}`);
  }

  @Get("comments")
  @ApiOperation({ summary: "Find all comments from a specific idea." })
  @ApiOkResponse({ description: "Found all comments from a specific idea." })
  @ApiNotFoundResponse({ description: "Specific idea was not found." })
  @ApiQuery({ name: "page", required: false })
  findAllIdeaComments(
    @Param("ideaId") ideaId: string,
    @Query("page") page: number
  ) {
    return this.commentIdeaService.findAllIdeaComments(ideaId, page);
  }

  @Post("comments")
  @UsePipes(ValidatorPipe)
  @UseGuards(UserAuthenticationGuard)
  @ApiOperation({ summary: "Create a comment in a specific idea." })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: "Invalid token or forbidden." })
  @ApiNotFoundResponse({ description: "The specific idea was not found." })
  @ApiBadRequestResponse({ description: "CommentDTO validation failed." })
  @ApiCreatedResponse({ description: "Created a comment in the specific idek." })
  createIdeaComment(
    @Param("ideaId") ideaId: string,
    @User("id") userId: string,
    @Body() data: CommentDTO
  ) {
    this.logData({ ideaId, userId, data });
    return this.commentIdeaService.createIdeaComment(ideaId, userId, data);
  }

  @Patch("comments/:commentId")
  @UsePipes(ValidatorPipe)
  @UseGuards(UserAuthenticationGuard)
  @ApiOperation({ summary: "Update a specific comment in a specific idea." })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: "Invalid token or forbidden." })
  @ApiNotFoundResponse({ description: "The specific idea or the specific comment was not found." })
  @ApiBadRequestResponse({ description: "CommentDTO validation failed." })
  @ApiOkResponse({ description: "Updated the specific comment on the specific idea." })
  updateIdeaComment(
    @Param("ideaId") ideaId: string,
    @Param("commentId") commentId: string,
    @User("id") userId: string,
    @Body() data: CommentDTO
  ) {
    this.logData({ ideaId, commentId, userId, data });
    return this.commentIdeaService.updateIdeaComment(ideaId, commentId, userId, data);
  }

  @Delete("comments/:commentId")
  @UseGuards(UserAuthenticationGuard)
  @ApiOperation({ summary: "Delete a specific comment in a specific idea." })
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: "Invalid token or forbidden." })
  @ApiNotFoundResponse({ description: "The specific idea or the specific comment was not found." })
  @ApiOkResponse({ description: "Deleted the specific comment on the specific idea." })
  deleteComment(
    @Param("ideaId") ideaId: string,
    @Param("commentId") commentId: string,
    @User("id") userId: string,
  ) {
    this.logData({ ideaId, commentId, userId });
    return this.commentIdeaService.deleteIdeaComment(ideaId, commentId, userId);
  }

}

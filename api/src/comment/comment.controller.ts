import { Controller, Get, Param, Query } from "@nestjs/common";
import { CommentService } from "./comment.service";
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiNotFoundResponse } from "@nestjs/swagger";

@Controller("comments")
@ApiTags("Comments")
export class CommentController {

  constructor(private commentService: CommentService) {
  }

  @Get()
  @ApiOperation({ summary: "Find all comments." })
  @ApiOkResponse({ description: "Found all comments." })
  @ApiQuery({ name: "page", required: false })
  findAllComments(@Query("page") page: number) {
    return this.commentService.findAllComments(page);
  }

  @Get(":id")
  @ApiOperation({ summary: "Find specific comment." })
  @ApiOkResponse({ description: "Found specific comment." })
  @ApiNotFoundResponse({ description: "Specific comment was not found." })
  findComment(@Param("id") id: string) {
    return this.commentService.findComment(id);
  }

}

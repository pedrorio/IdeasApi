import { Controller, Get, Param, Query } from "@nestjs/common";
import { CommentUserService } from "./comment-user.service";
import { ApiOperation, ApiOkResponse, ApiImplicitQuery, ApiNotFoundResponse, ApiUseTags } from "@nestjs/swagger";

@Controller("users/:userId")
@ApiUseTags("User Comments")
export class CommentUserController {

  constructor(private commentUserService: CommentUserService) {
  }

  @Get("comments")
  @ApiOperation({ title: "Find all comments from a specific user." })
  @ApiOkResponse({ description: "Found all comments from a specific user." })
  @ApiNotFoundResponse({ description: "Specific user was not found." })
  @ApiImplicitQuery({ name: "page", required: false })
  findAllUserComments(
    @Param("userId") userId: string,
    @Query("page") page: number
  ) {
    return this.commentUserService.findAllUserComments(userId, page);
  }

}

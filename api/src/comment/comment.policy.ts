import { UserEntity } from "../user/user.entity";
import { HttpException, HttpStatus } from "@nestjs/common";
import { CommentEntity } from "./comment.entity";

export class CommentPolicy {

  static authorize(userEntity: UserEntity | null, commentEntity: CommentEntity | null) {

    if (!commentEntity) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    if (!userEntity || !commentEntity.author || userEntity.id !== commentEntity.author.id) {
      throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
    }

  }
}

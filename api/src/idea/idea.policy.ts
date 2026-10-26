import { IdeaEntity } from "./idea.entity";
import { UserEntity } from "../user/user.entity";
import { HttpException, HttpStatus } from "@nestjs/common";

export class IdeaPolicy {

  static authorize(userEntity: UserEntity | null, ideaEntity: IdeaEntity | null) {

    if (!ideaEntity) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    if (!userEntity || !ideaEntity.author || userEntity.id !== ideaEntity.author.id) {
      throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
    }

  }
}

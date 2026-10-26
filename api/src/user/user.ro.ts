import { IdeaRO } from "../idea/idea.ro";
import { UserEntity } from "./user.entity";
import { CommentRO } from "../comment/comment.ro";
import { ApiProperty } from "@nestjs/swagger";

export class UserRO {
  @ApiProperty()
  id: string;

  @ApiProperty()
  created: Date;

  @ApiProperty()
  updated: Date;

  @ApiProperty()
  username: string;

  @ApiProperty({
    type: [IdeaRO],
    required: false
  })
  ideas?: IdeaRO[];

  @ApiProperty({
    type: [IdeaRO],
    required: false
  })
  bookmarks?: IdeaRO[];

  @ApiProperty({
    type: [CommentRO],
    required: false
  })
  comments?: CommentRO[];

  static fromUser(userEntity: UserEntity) {
    const { id, created, updated, username } = userEntity;

    const userRO: UserRO = {
      id,
      created,
      updated,
      username
    };

    if (userEntity.ideas) {
      userRO.ideas = userEntity.ideas.map(idea => IdeaRO.fromIdea(idea));
    }

    if (userEntity.bookmarks) {
      userRO.bookmarks = userEntity.bookmarks.map(bookmark => IdeaRO.fromIdea(bookmark));
    }

    if (userEntity.comments) {
      userRO.comments = userEntity.comments.map(comment => CommentRO.fromComment(comment));
    }

    return userRO;
  }
}

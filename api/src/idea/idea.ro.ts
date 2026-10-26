import { IdeaEntity } from "./idea.entity";
import { UserRO } from "../user/user.ro";
import { CommentRO } from "../comment/comment.ro";
import { readScore } from "./vote/scores";

export class IdeaRO {
  id: string;
  created: Date;
  updated: Date;

  idea: string;
  description: string;

  author?: UserRO;
  score: number;

  comments?: CommentRO[];

  static fromIdea(ideaEntity: IdeaEntity) {
    const {
      id, created, updated, idea, description
    } = ideaEntity;

    const ideaRO: IdeaRO = {
      id, created, updated, idea, description,
      score: readScore(ideaEntity)
    };

    if (ideaEntity.author) {
      ideaRO.author = UserRO.fromUser(ideaEntity.author);
    }

    if (ideaEntity.comments) {
      ideaRO.comments = ideaEntity.comments.map(comment => CommentRO.fromComment(comment));
    }

    return ideaRO;
  }
}

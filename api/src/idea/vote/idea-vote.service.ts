import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { IdeaEntity } from "../idea.entity";

const ideaIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class VoteResult {
  score: number;
  viewerVote: number;
}

@Injectable()
export class IdeaVoteService {
  constructor(
    @InjectRepository(IdeaEntity)
    private ideaRepository: Repository<IdeaEntity>
  ) {
  }

  async setVote(ideaId: string, userId: string, value: number): Promise<VoteResult> {
    if (value !== -1 && value !== 0 && value !== 1) {
      throw new HttpException("value must be -1, 0, or 1", HttpStatus.BAD_REQUEST);
    }

    if (!ideaIdPattern.test(ideaId)) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    return this.ideaRepository.manager.transaction(async (manager) => {
      const idea = await manager.findOne(IdeaEntity, { where: { id: ideaId }, select: ["id"] });
      if (!idea) {
        throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
      }

      if (value === 0) {
        await manager.query(
          `DELETE FROM "votes" WHERE "user_id" = $1 AND "idea_id" = $2`,
          [userId, ideaId]
        );
      } else {
        await manager.query(
          `INSERT INTO "votes" ("user_id", "idea_id", "value") VALUES ($1, $2, $3) ` +
          `ON CONFLICT ("user_id", "idea_id") DO UPDATE SET "value" = EXCLUDED."value" ` +
          `WHERE "votes"."value" IS DISTINCT FROM EXCLUDED."value"`,
          [userId, ideaId, value]
        );
      }

      const scoreRows: Array<{ score: string | number }> = await manager.query(
        `SELECT COALESCE(SUM("value"), 0) AS "score" FROM "votes" WHERE "idea_id" = $1`,
        [ideaId]
      );
      const viewerRows: Array<{ value: string | number }> = await manager.query(
        `SELECT "value" FROM "votes" WHERE "user_id" = $1 AND "idea_id" = $2`,
        [userId, ideaId]
      );

      return {
        score: Number(scoreRows[0].score),
        viewerVote: viewerRows.length === 0 ? 0 : Number(viewerRows[0].value)
      };
    });
  }
}

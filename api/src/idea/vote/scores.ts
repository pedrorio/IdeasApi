import { EntityManager } from "typeorm";
import { IdeaEntity } from "../idea.entity";
import { VoteEntity } from "./vote.entity";

const scores = new WeakMap<IdeaEntity, number>();

export function readScore(idea: IdeaEntity): number {
  const score = scores.get(idea);
  return score === undefined ? 0 : score;
}

export async function assignScores(manager: EntityManager, ideas: Array<IdeaEntity | undefined>): Promise<void> {
  const present = ideas.filter((idea): idea is IdeaEntity => Boolean(idea && idea.id));
  if (present.length === 0) {
    return;
  }

  const ids = Array.from(new Set(present.map(idea => idea.id)));
  const rows: Array<{ ideaId: string; score: string | number }> = await manager
    .createQueryBuilder(VoteEntity, "vote")
    .select("vote.ideaId", "ideaId")
    .addSelect("SUM(vote.value)", "score")
    .where("vote.ideaId IN (:...ids)", { ids })
    .groupBy("vote.ideaId")
    .getRawMany();
  const byId = new Map(rows.map(row => [row.ideaId, Number(row.score)]));

  for (const idea of present) {
    const score = byId.get(idea.id);
    scores.set(idea, score === undefined ? 0 : score);
  }
}

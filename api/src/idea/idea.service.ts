import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { In, Repository } from "typeorm";
import { IdeaEntity } from "./idea.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { IdeaDTO } from "./idea.dto";
import { UserEntity } from "../user/user.entity";
import { IdeaRO } from "./idea.ro";
import { IdeaPolicy } from "./idea.policy";
import { decodeIdeaCursor, encodeIdeaCursor, parsePageLimit } from "./idea-page";
import { assignScores } from "./vote/scores";

function ideaText(data: Partial<IdeaDTO>): { idea?: string; description?: string } {
  const fields: { idea?: string; description?: string } = {};
  if (typeof data.idea === "string") {
    fields.idea = data.idea;
  }
  if (typeof data.description === "string") {
    fields.description = data.description;
  }
  return fields;
}

export class IdeaPage {
  items: IdeaRO[];
  nextCursor: string | null;
}

@Injectable()
export class IdeaService {
  constructor(
    @InjectRepository(IdeaEntity)
    private ideaRepository: Repository<IdeaEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>
  ) {
  }

  async findIdeaPage(cursor?: string | null, limitInput?: unknown): Promise<IdeaPage> {
    const limit = parsePageLimit(limitInput);
    const decoded = cursor ? decodeIdeaCursor(cursor) : undefined;
    const qb = this.ideaRepository.createQueryBuilder("idea")
      .orderBy("idea.created", "DESC")
      .addOrderBy("idea.id", "DESC")
      .take(limit + 1);

    if (decoded) {
      qb.where(
        "(idea.created < :created OR (idea.created = :created AND idea.id < :id))",
        { created: decoded.created, id: decoded.id }
      );
    }

    const rows = await qb.getMany();
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    if (page.length === 0) {
      return { items: [], nextCursor: null };
    }

    const loaded = await this.ideaRepository.find({
      where: { id: In(page.map(idea => idea.id)) },
      relations: ["author", "comments"]
    });
    const byId = new Map(loaded.map(idea => [idea.id, idea]));
    const ordered: IdeaEntity[] = [];
    for (const row of page) {
      const idea = byId.get(row.id);
      if (!idea) {
        throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
      }
      ordered.push(idea);
    }
    await assignScores(this.ideaRepository.manager, ordered);
    const last = page[page.length - 1];

    return {
      items: ordered.map(idea => IdeaRO.fromIdea(idea)),
      nextCursor: hasMore ? encodeIdeaCursor(last.created, last.id) : null
    };
  }

  async findIdea(id: string) {
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ["author", "comments"]
    });

    if (!idea) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    await assignScores(this.ideaRepository.manager, [idea]);
    return IdeaRO.fromIdea(idea);
  }

  async createIdea(userId: string, data: IdeaDTO) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const idea = this.ideaRepository.create({
      idea: data.idea,
      description: data.description,
      author: user
    });

    await this.ideaRepository.save(idea);
    return IdeaRO.fromIdea(idea);
  }

  async updateIdea(id: string, userId: string, data: Partial<IdeaDTO>) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    let idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ["author", "comments"]
    });

    if (!idea) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    IdeaPolicy.authorize(user, idea);
    await this.ideaRepository.update(id, ideaText(data));

    idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ["author", "comments"]
    });
    await assignScores(this.ideaRepository.manager, [idea]);
    return IdeaRO.fromIdea(idea);
  }

  async deleteIdea(id: string, userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const idea = await this.ideaRepository.findOne({
      where: { id },
      relations: ["author", "comments"]
    });

    if (!idea) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    IdeaPolicy.authorize(user, idea);
    await assignScores(this.ideaRepository.manager, [idea]);
    const response = IdeaRO.fromIdea(idea);
    await this.ideaRepository.delete(id);
    return response;
  }
}

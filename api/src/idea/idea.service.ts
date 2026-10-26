import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { Repository } from "typeorm";
import { IdeaEntity } from "./idea.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { IdeaDTO } from "./idea.dto";
import { UserEntity } from "../user/user.entity";
import { IdeaRO } from "./idea.ro";
import { IdeaPolicy } from "./idea.policy";

@Injectable()
export class IdeaService {
  constructor(
    @InjectRepository(IdeaEntity)
    private ideaRepository: Repository<IdeaEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>
  ) {
  }

  async findAllIdeas(page: number = 1) {
    const ideas = await this.ideaRepository.find({
      relations: [
        "author",
        "upvotes",
        "downvotes",
        "comments"
      ],
      take: 25,
      skip: 25 * (page - 1)
    });

    return ideas.map(idea => IdeaRO.fromIdea(idea));
  }

  async findIdea(id: string) {
    const idea = await this.ideaRepository.findOne({ where: { id },
      relations: [
        "author",
        "upvotes",
        "downvotes",
        "comments"
      ]
    });

    if (!idea) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    return IdeaRO.fromIdea(idea);
  }

  async createIdea(userId: string, data: IdeaDTO) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const idea = await this.ideaRepository.create({ ...data, author: user });

    await this.ideaRepository.save(idea);
    return IdeaRO.fromIdea(idea);
  }

  async updateIdea(id: string, userId: string, data: Partial<IdeaDTO>) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    let idea = await this.ideaRepository.findOne({ where: { id },
      relations: [
        "author",
        "upvotes",
        "downvotes",
        "comments"
      ]
    });

    if (!idea) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    IdeaPolicy.authorize(user, idea);
    await this.ideaRepository.update(id, data);

    idea = await this.ideaRepository.findOne({ where: { id },
      relations: [
        "author",
        "upvotes",
        "downvotes",
        "comments"
      ]
    });
    return IdeaRO.fromIdea(idea);
  }

  async deleteIdea(id: string, userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const idea = await this.ideaRepository.findOne({ where: { id },
      relations: [
        "author",
        "upvotes",
        "downvotes",
        "comments"
      ]
    });

    if (!idea) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    IdeaPolicy.authorize(user, idea);
    await this.ideaRepository.delete(id);

    return IdeaRO.fromIdea(idea);
  }

}

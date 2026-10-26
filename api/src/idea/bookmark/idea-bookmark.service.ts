import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { IdeaEntity } from "../idea.entity";
import { UserEntity } from "../../user/user.entity";
import { UserRO } from "../../user/user.ro";

@Injectable()
export class IdeaBookmarkService {
  constructor(
    @InjectRepository(IdeaEntity)
    private ideaRepository: Repository<IdeaEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>
  ) {}

  async bookmarkIdea(id: string, userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const idea = await this.ideaRepository.findOne({ where: { id }, relations: ["author"] });

    if (!idea) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    const ideaBookmarks = user.bookmarks.filter(bookmark => {
      return JSON.stringify(bookmark) === JSON.stringify(idea);
    });
    if (ideaBookmarks.length !== 0) {
      throw new HttpException("Idea is already bookmarked", HttpStatus.BAD_REQUEST);
    }

    user.bookmarks.push(idea);
    await this.userRepository.save(user);

    return UserRO.fromUser(user);

  }

  async unbookmarkIdea(id: string, userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const idea = await this.ideaRepository.findOne({ where: { id }, relations: ["author"] });

    if (!idea) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    const ideaBookmarks = user.bookmarks.filter(bookmark => {
      return JSON.stringify(bookmark) === JSON.stringify(idea);
    });
    if (ideaBookmarks.length === 0) {
      throw new HttpException("Idea is not bookmarked", HttpStatus.BAD_REQUEST);
    }

    user.bookmarks = user.bookmarks.filter(bookmark => {
      return JSON.stringify(bookmark) === JSON.stringify(idea);
    });
    await this.userRepository.save(user);

    return UserRO.fromUser(user);

  }

}

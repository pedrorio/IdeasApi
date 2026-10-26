import {
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";

import { Repository } from "typeorm";

import { UserEntity } from "./user.entity";
import { UserRO } from "./user.ro";
import { assignScores } from "../idea/vote/scores";

@Injectable()
export class UserService {

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>
  ) {
  }

  async findAllUsers(page: number = 1) {
    const users = await this.userRepository.find(
      {
        relations:
          [
            "ideas",
            "bookmarks",
            "comments"
          ],
        take: 25,
        skip: 25 * (page - 1)
      }
    );

    const ideas = users.reduce((collected, user) => {
      return collected.concat(user.ideas || [], user.bookmarks || []);
    }, []);
    await assignScores(this.userRepository.manager, ideas);
    return users.map(user => UserRO.fromUser(user));
  }

  async findUser(username: string) {

    const user = await this.userRepository.findOne({
      where: { username },
      relations:
          [
            "ideas",
            "bookmarks",
            "comments"
          ]
    });

    if (!user) {
      throw new HttpException("User Not Found", HttpStatus.NOT_FOUND);
    }

    await assignScores(
      this.userRepository.manager,
      (user.ideas || []).concat(user.bookmarks || [])
    );
    return UserRO.fromUser(user);
  }

}

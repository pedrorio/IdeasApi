import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

import { CommentEntity } from "../comment.entity";
import { CommentRO } from "../comment.ro";
import { UserEntity } from "../../user/user.entity";

@Injectable()
export class CommentUserService {
  constructor(
    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {
  }

  async findAllCommentsByUser(id: string, page: number = 1) {
    const user = await this.userRepository.findOne(id);

    if (!user) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    const comments = await this.commentRepository.find({
      where: { author: user },
      relations: ["author", "idea"],
      take: 25,
      skip: 25 * (page - 1)
    });

    return comments.map(comment => CommentRO.fromComment(comment));
  }

}

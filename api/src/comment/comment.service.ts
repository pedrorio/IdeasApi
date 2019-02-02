import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

import { CommentEntity } from "./comment.entity";
import { CommentRO } from "./comment.ro";

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>,
  ) {
  }

  async findAllComments(page: number = 1) {
    const comments = await this.commentRepository.find({
      relations: ["author", "idea"],
      take: 25,
      skip: 25 * (page - 1)
    });

    return comments.map(comment => CommentRO.fromComment(comment));
  }

  async findComment(id: string) {
    const comment = await this.commentRepository.findOne(id, { relations: ["author", "idea"] });

    if (!comment) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    return CommentRO.fromComment(comment);
  }

}

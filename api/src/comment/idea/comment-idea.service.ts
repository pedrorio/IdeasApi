import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

import { CommentEntity } from "../comment.entity";
import { CommentRO } from "../comment.ro";
import { IdeaEntity } from "../../idea/idea.entity";
import { CommentDTO } from "../comment.dto";
import { UserEntity } from "../../user/user.entity";
import { CommentPolicy } from "../comment.policy";

@Injectable()
export class CommentIdeaService {
  constructor(
    @InjectRepository(CommentEntity)
    private commentRepository: Repository<CommentEntity>,
    @InjectRepository(IdeaEntity)
    private ideaRepository: Repository<IdeaEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>
  ) {
  }

  async findAllIdeaComments(ideaId: string, page: number = 1) {
    const idea = await this.ideaRepository.findOne({ where: { id: ideaId } });

    if (!idea) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    const comments = await this.commentRepository.find({
      where: { idea: { id: idea.id } },
      relations: ["author", "idea"],
      take: 25,
      skip: 25 * (page - 1)
    });

    return comments.map(comment => CommentRO.fromComment(comment));
  }

  async createIdeaComment(ideaId: string, userId: string, data: CommentDTO) {

    const idea = await this.ideaRepository.findOne({ where: { id: ideaId } });

    if (!idea) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const comment = await this.commentRepository.create(
      { ...data, idea, author: user }
    );

    await this.commentRepository.save(comment);
    return CommentRO.fromComment(comment);
  }

  async updateIdeaComment(
    ideaId: string,
    commentId: string,
    userId: string,
    data: Partial<CommentDTO>
  ) {
    const idea = await this.ideaRepository.findOne({ where: { id: ideaId } });

    if (!idea) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });

    let comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ["author", "idea"]
    });

    if (!comment) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    CommentPolicy.authorize(user, comment);
    await this.commentRepository.update(
      commentId,
      { ...data, idea, author: user }
    );

    comment = await this.commentRepository.findOne({
      where: { id: commentId },
      relations: ["author", "idea"]
    });
    return CommentRO.fromComment(comment);
  }

  async deleteIdeaComment(
    ideaId: string,
    commentId: string,
    userId: string,
  ) {
    const idea = await this.ideaRepository.findOne({ where: { id: ideaId } });

    if (!idea) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const comment = await this.commentRepository.findOne({ where: { id: commentId }, relations: ["author", "idea"] });

    if (!comment) {
      throw new HttpException("Not Found", HttpStatus.NOT_FOUND);
    }

    CommentPolicy.authorize(user, comment);
    await this.commentRepository.delete(commentId);

    return CommentRO.fromComment(comment);
  }

}

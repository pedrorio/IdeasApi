import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity, JoinTable, ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { compare, hash } from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { IdeaEntity } from "../idea/idea.entity";
import { jwtSecret } from "../app.constants";
import { CommentEntity } from "../comment/comment.entity";
import { ApiProperty } from "@nestjs/swagger";

@Entity("user")
export class UserEntity {

  @PrimaryGeneratedColumn("uuid")
  @ApiProperty()
  id: string;

  @CreateDateColumn()
  @ApiProperty()
  created: Date;

  @UpdateDateColumn()
  @ApiProperty()
  updated: Date;

  @Column({
    type: "text",
    unique: true
  })
  @ApiProperty()
  username: string;

  @Column("text")
  @ApiProperty()
  password: string;

  @OneToMany(type => IdeaEntity, idea => idea.author)
  @ApiProperty({
    type: [IdeaEntity]
  })
  ideas: IdeaEntity[];

  @ManyToMany(type => IdeaEntity, { cascade: true })
  @JoinTable()
  @ApiProperty({
    type: [IdeaEntity]
  })
  bookmarks: IdeaEntity[];

  @OneToMany(type => CommentEntity, comment => comment.author)
  @ApiProperty({
    type: [CommentEntity]
  })
  comments: CommentEntity[];

  @BeforeInsert()
  async hashPassword() {
    this.password = await hash(this.password, 10);
  }

  async comparePassword(candidatePassword: string) {
    return await compare(candidatePassword, this.password);
  }

  get token() {
    const { id, username } = this;
    return jwt.sign(
      { id, username },
      jwtSecret,
      { algorithm: "HS256", expiresIn: "7d" }
    );
  }
}

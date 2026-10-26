import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { UserEntity } from "../../user/user.entity";
import { IdeaEntity } from "../idea.entity";

@Entity("votes")
@Index(["ideaId"])
export class VoteEntity {
  @PrimaryColumn("uuid", { name: "user_id" })
  userId: string;

  @PrimaryColumn("uuid", { name: "idea_id" })
  ideaId: string;

  @Column({ type: "smallint" })
  value: number;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @ManyToOne(() => IdeaEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "idea_id" })
  idea: IdeaEntity;
}

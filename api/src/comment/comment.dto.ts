import { IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CommentDTO {
  @IsString()
  @ApiProperty()
  comment: string;
}

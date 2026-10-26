import { IsIn, IsInt } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SetVoteDTO {
  @IsInt()
  @IsIn([-1, 0, 1])
  @ApiProperty({ enum: [-1, 0, 1] })
  value: number;
}

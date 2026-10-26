import {
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

import { UserEntity } from "../../user.entity";
import { UserDTO } from "../../user.dto";
import { UserAuthenticationRO } from "../user-authentication.ro";

@Injectable()
export class UserAuthenticationSessionService {

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>
  ) {
  }

  async createSession(data: UserDTO) {
    const { username, password } = data;
    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new HttpException("Invalid credentials", HttpStatus.BAD_REQUEST);
    }

    const correctPassword = await user.comparePassword(password);

    if (!correctPassword) {
      throw new HttpException("Invalid credentials", HttpStatus.BAD_REQUEST);
    }

    return UserAuthenticationRO.fromUser(user);
  }

}

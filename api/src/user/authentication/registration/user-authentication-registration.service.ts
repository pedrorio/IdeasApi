import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { UserDTO } from "../../user.dto";
import { UserEntity } from "../../user.entity";
import { UserAuthenticationRO } from "../user-authentication.ro";

@Injectable()
export class UserAuthenticationRegistrationService {

  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>
  ) {
  }

  async createRegistration(data: UserDTO) {
    const username = data.username;
    const existing = await this.userRepository.findOne({ where: { username } });

    if (existing) {
      throw new HttpException("User already exists", HttpStatus.BAD_REQUEST);
    }

    const user = this.userRepository.create({
      username: data.username,
      password: data.password
    });
    await this.userRepository.save(user);

    return UserAuthenticationRO.fromUser(user);
  }

  async findRegistration(username: string) {
    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new UnauthorizedException("Unknown user");
    }

    return UserAuthenticationRO.fromUser(user);

  }
}

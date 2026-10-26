import {
  HttpException,
  HttpStatus,
  Injectable,
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
    const { username } = data;
    let user = await this.userRepository.findOne({ where: { username } });

    if (user) {
      throw new HttpException("User already exists", HttpStatus.BAD_REQUEST);
    }

    user = await this.userRepository.create(data);
    await this.userRepository.save(user);

    return UserAuthenticationRO.fromUser(user);
  }

  async findRegistration(username: string) {
    const user = await this.userRepository.findOne({ where: { username } });

    if (!user) {
      throw new HttpException(
        "Invalid Token",
        HttpStatus.FORBIDDEN
      );
    }

    return UserAuthenticationRO.fromUser(user);

  }
}

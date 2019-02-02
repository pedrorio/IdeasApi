import {
  Body, Controller,
  Post,
  UsePipes
} from "@nestjs/common";
import { UserAuthenticationRegistrationService } from "./user-authentication-registration.service";
import { ValidatorPipe } from "../../../shared/validator.pipe";
import { UserDTO } from "../../user.dto";
import { ApiOkResponse, ApiBadRequestResponse, ApiOperation, ApiUseTags } from "@nestjs/swagger";

@Controller("auth")
@ApiUseTags("User Authentication Registrations")
export class UserAuthenticationRegistrationController {
  constructor(
    private userAuthenticationRegistrationService: UserAuthenticationRegistrationService,
  ) {
  }

  @Post("register")
  @UsePipes(ValidatorPipe)
  @ApiOperation({ title: "Create user registration." })
  @ApiOkResponse({ description: "Created user registration." })
  @ApiBadRequestResponse({ description: "UserDTO validation failed or user already exists." })
  createRegistration(@Body() data: UserDTO) {
    return this.userAuthenticationRegistrationService.createRegistration(data);
  }
}

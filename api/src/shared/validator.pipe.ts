import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import { getMetadataStorage, validate, ValidationError } from "class-validator";
import { plainToClass } from "class-transformer";

@Injectable()
export class ValidatorPipe implements PipeTransform<unknown> {
  async transform(value: unknown, metadata: ArgumentMetadata) {

    if (value instanceof Object && this.isEmpty(value)) {
      throw new HttpException(
        "Validation failed: No body submited",
        HttpStatus.BAD_REQUEST
      );
    }

    const { metatype } = metadata;
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }
    if (getMetadataStorage().getTargetValidationMetadatas(metatype, "", false, false).length === 0) {
      return value;
    }
    const object = plainToClass(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true
    });
    if (errors.length > 0) {
      throw new HttpException(
        `Validation failed: ${this.formatErrors(errors)}`,
        HttpStatus.BAD_REQUEST
      );
    }
    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.find((type) => metatype === type);
  }

  private formatErrors(errors: ValidationError[]) {
    return errors.map(error => {
      const constraints = error.constraints ?? {};
      return Object.values(constraints);
    }).join(" ,");
  }

  private isEmpty(value: object) {
    return Object.keys(value).length === 0;
  }
}

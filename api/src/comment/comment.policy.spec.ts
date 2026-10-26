import { HttpException } from "@nestjs/common";
import { CommentPolicy } from "./comment.policy";
import { CommentEntity } from "./comment.entity";
import { UserEntity } from "../user/user.entity";

describe("CommentPolicy", () => {
  it("rejects a missing author with 401", () => {
    const user = new UserEntity();
    user.id = "user-1";
    const comment = new CommentEntity();

    expect(() => CommentPolicy.authorize(user, comment)).toThrow(HttpException);
    try {
      CommentPolicy.authorize(user, comment);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error).not.toBeInstanceOf(TypeError);
      if (error instanceof HttpException) {
        expect(error.getStatus()).toBe(401);
      }
    }
  });
});

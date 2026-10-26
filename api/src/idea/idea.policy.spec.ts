import { HttpException } from "@nestjs/common";
import { IdeaPolicy } from "./idea.policy";
import { IdeaEntity } from "./idea.entity";
import { UserEntity } from "../user/user.entity";

describe("IdeaPolicy", () => {
  it("rejects a missing author with 401", () => {
    const user = new UserEntity();
    user.id = "user-1";
    const idea = new IdeaEntity();

    expect(() => IdeaPolicy.authorize(user, idea)).toThrow(HttpException);
    try {
      IdeaPolicy.authorize(user, idea);
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect(error).not.toBeInstanceOf(TypeError);
      if (error instanceof HttpException) {
        expect(error.getStatus()).toBe(401);
      }
    }
  });
});

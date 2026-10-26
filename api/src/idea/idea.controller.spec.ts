import { Test, TestingModule } from "@nestjs/testing";
import { IdeaController } from "./idea.controller";
import { IdeaService } from "./idea.service";
import { UserAuthenticationGuard } from "../user/authentication/user-authentication.guard";

describe("Idea Controller", () => {
  let controller: IdeaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdeaController],
      providers: [
        { provide: IdeaService, useValue: {} },
      ],
    })
      .overrideGuard(UserAuthenticationGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<IdeaController>(IdeaController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});

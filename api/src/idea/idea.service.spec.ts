import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { IdeaService } from "./idea.service";
import { IdeaEntity } from "./idea.entity";
import { UserEntity } from "../user/user.entity";

describe("IdeaVoteUpvoteService", () => {
  let service: IdeaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdeaService,
        { provide: getRepositoryToken(IdeaEntity), useValue: {} },
        { provide: getRepositoryToken(UserEntity), useValue: {} },
      ],
    }).compile();

    service = module.get<IdeaService>(IdeaService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});

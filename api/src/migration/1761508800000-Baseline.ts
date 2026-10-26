import { MigrationInterface, QueryRunner } from "typeorm";

export class Baseline1761508800000 implements MigrationInterface {
  name = "Baseline1761508800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(
      `CREATE TABLE "comment" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
      `"created" TIMESTAMP NOT NULL DEFAULT now(), "updated" TIMESTAMP NOT NULL DEFAULT now(), ` +
      `"comment" text NOT NULL, "authorId" uuid, "ideaId" uuid, ` +
      `CONSTRAINT "PK_0b0e4bbc8415ec426f87f3a88e2" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "idea" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
      `"created" TIMESTAMP NOT NULL DEFAULT now(), "updated" TIMESTAMP NOT NULL DEFAULT now(), ` +
      `"idea" text NOT NULL, "description" text NOT NULL, "authorId" uuid, ` +
      `CONSTRAINT "PK_5096f543c484b349f5234da9d97" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), ` +
      `"created" TIMESTAMP NOT NULL DEFAULT now(), "updated" TIMESTAMP NOT NULL DEFAULT now(), ` +
      `"username" text NOT NULL, "password" text NOT NULL, ` +
      `CONSTRAINT "UQ_78a916df40e02a9deb1c4b75edb" UNIQUE ("username"), ` +
      `CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "idea_upvotes_user" ("ideaId" uuid NOT NULL, "userId" uuid NOT NULL, ` +
      `CONSTRAINT "PK_3580e0be5b280c2d81f0e709ce2" PRIMARY KEY ("ideaId", "userId"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_d08e4b67dd2f23ea484a78fd8a" ON "idea_upvotes_user" ("ideaId")`);
    await queryRunner.query(`CREATE INDEX "IDX_5da87a862c47889e7a78be7533" ON "idea_upvotes_user" ("userId")`);
    await queryRunner.query(
      `CREATE TABLE "idea_downvotes_user" ("ideaId" uuid NOT NULL, "userId" uuid NOT NULL, ` +
      `CONSTRAINT "PK_f2343edf10edc86045018a2d3a7" PRIMARY KEY ("ideaId", "userId"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_de10a42d0bcf83a6e913ebc893" ON "idea_downvotes_user" ("ideaId")`);
    await queryRunner.query(`CREATE INDEX "IDX_8ab050e2633941e8c038ba4c5b" ON "idea_downvotes_user" ("userId")`);
    await queryRunner.query(
      `CREATE TABLE "user_bookmarks_idea" ("userId" uuid NOT NULL, "ideaId" uuid NOT NULL, ` +
      `CONSTRAINT "PK_e0ae74f2721d64a3afa6917d2e6" PRIMARY KEY ("userId", "ideaId"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_57a5c456ea2f8aa6b74dc8eb23" ON "user_bookmarks_idea" ("userId")`);
    await queryRunner.query(`CREATE INDEX "IDX_99eeae9c25ea8532138978937c" ON "user_bookmarks_idea" ("ideaId")`);
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_276779da446413a0d79598d4fbd" ` +
      `FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "comment" ADD CONSTRAINT "FK_861b419cce1c9ae64295300d6b6" ` +
      `FOREIGN KEY ("ideaId") REFERENCES "idea"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "idea" ADD CONSTRAINT "FK_67530863c810fc8fd60c3d59b4e" ` +
      `FOREIGN KEY ("authorId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "idea_upvotes_user" ADD CONSTRAINT "FK_d08e4b67dd2f23ea484a78fd8af" ` +
      `FOREIGN KEY ("ideaId") REFERENCES "idea"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "idea_upvotes_user" ADD CONSTRAINT "FK_5da87a862c47889e7a78be75332" ` +
      `FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "idea_downvotes_user" ADD CONSTRAINT "FK_de10a42d0bcf83a6e913ebc893f" ` +
      `FOREIGN KEY ("ideaId") REFERENCES "idea"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "idea_downvotes_user" ADD CONSTRAINT "FK_8ab050e2633941e8c038ba4c5b7" ` +
      `FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "user_bookmarks_idea" ADD CONSTRAINT "FK_57a5c456ea2f8aa6b74dc8eb230" ` +
      `FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
    await queryRunner.query(
      `ALTER TABLE "user_bookmarks_idea" ADD CONSTRAINT "FK_99eeae9c25ea8532138978937ce" ` +
      `FOREIGN KEY ("ideaId") REFERENCES "idea"("id") ON DELETE CASCADE ON UPDATE CASCADE`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "comment"`);
    await queryRunner.query(`DROP TABLE "idea_upvotes_user"`);
    await queryRunner.query(`DROP TABLE "idea_downvotes_user"`);
    await queryRunner.query(`DROP TABLE "user_bookmarks_idea"`);
    await queryRunner.query(`DROP TABLE "idea"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP EXTENSION IF EXISTS "uuid-ossp"`);
  }
}

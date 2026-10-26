import { MigrationInterface, QueryRunner } from "typeorm";

export class Votes1761600000000 implements MigrationInterface {
  name = "Votes1761600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "votes" ("user_id" uuid NOT NULL, "idea_id" uuid NOT NULL, "value" smallint NOT NULL, ` +
      `CONSTRAINT "PK_b0cb418b888505da5b07a458dea" PRIMARY KEY ("user_id", "idea_id"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_ae1f6238e09b3ecf27ab8355da" ON "votes" ("idea_id")`);
    await queryRunner.query(
      `ALTER TABLE "votes" ADD CONSTRAINT "FK_27be2cab62274f6876ad6a31641" ` +
      `FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "votes" ADD CONSTRAINT "FK_ae1f6238e09b3ecf27ab8355dac" ` +
      `FOREIGN KEY ("idea_id") REFERENCES "idea"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(`DROP TABLE "idea_upvotes_user"`);
    await queryRunner.query(`DROP TABLE "idea_downvotes_user"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
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
    await queryRunner.query(`DROP TABLE "votes"`);
  }
}

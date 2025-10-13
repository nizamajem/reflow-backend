import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreatedByToGeneratedAccounts1729000000000 implements MigrationInterface {
  name = "AddCreatedByToGeneratedAccounts1729000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "generated_accounts"
      ADD COLUMN "created_by_user_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "generated_accounts"
      ADD CONSTRAINT "FK_generated_accounts_created_by_user"
      FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_generated_accounts_created_by_user_id"
      ON "generated_accounts" ("created_by_user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "generated_accounts"
      DROP CONSTRAINT IF EXISTS "FK_generated_accounts_created_by_user"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_generated_accounts_created_by_user_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "generated_accounts"
      DROP COLUMN "created_by_user_id"
    `);
  }
}

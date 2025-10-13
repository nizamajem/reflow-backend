import { MigrationInterface, QueryRunner } from "typeorm";

export class InitPortalSchema1728200000000 implements MigrationInterface {
  name = "InitPortalSchema1728200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(
      `CREATE TYPE "user_tier_enum" AS ENUM ('student', 'public')`
    );
    await queryRunner.query(
      `CREATE TYPE "payment_method_enum" AS ENUM ('cash', 'midtrans_sandbox', 'midtrans_production')`
    );

    await queryRunner.query(`
      CREATE TABLE "packages" (
        "id" character varying NOT NULL,
        "name" character varying NOT NULL,
        "duration_label" character varying NOT NULL,
        "description" text NOT NULL,
        "benefits" jsonb NOT NULL,
        "base_price" jsonb NOT NULL,
        "price" jsonb NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_packages_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "package_credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "package_id" character varying NOT NULL,
        "tier" "user_tier_enum" NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "used" boolean NOT NULL DEFAULT false,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "assigned_account_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_package_credentials_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "partnership_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_partnership_accounts_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_partnership_accounts_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "portal_settings" (
        "id" character varying NOT NULL,
        "payment_methods" jsonb NOT NULL DEFAULT '{"cash": true, "midtrans_sandbox": false, "midtrans_production": false}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_portal_settings_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "generated_accounts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "package_id" character varying,
        "package_name" character varying NOT NULL,
        "tier" "user_tier_enum" NOT NULL,
        "payment_method" "payment_method_enum" NOT NULL,
        "price_paid" numeric NOT NULL,
        "credential_email" character varying NOT NULL,
        "credential_password" character varying NOT NULL,
        "customer_name" character varying NOT NULL,
        "customer_phone" character varying NOT NULL,
        "customer_email" character varying,
        "credential_id" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_generated_accounts_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "package_credentials"
      ADD CONSTRAINT "FK_package_credentials_package" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "generated_accounts"
      ADD CONSTRAINT "FK_generated_accounts_package" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "generated_accounts"
      ADD CONSTRAINT "FK_generated_accounts_credential" FOREIGN KEY ("credential_id") REFERENCES "package_credentials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "package_credentials"
      ADD CONSTRAINT "FK_package_credentials_assigned_account" FOREIGN KEY ("assigned_account_id") REFERENCES "generated_accounts"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "package_credentials" DROP CONSTRAINT "FK_package_credentials_assigned_account"
    `);
    await queryRunner.query(`
      ALTER TABLE "generated_accounts" DROP CONSTRAINT "FK_generated_accounts_credential"
    `);
    await queryRunner.query(`
      ALTER TABLE "generated_accounts" DROP CONSTRAINT "FK_generated_accounts_package"
    `);
    await queryRunner.query(`
      ALTER TABLE "package_credentials" DROP CONSTRAINT "FK_package_credentials_package"
    `);

    await queryRunner.query(`DROP TABLE "generated_accounts"`);
    await queryRunner.query(`DROP TABLE "portal_settings"`);
    await queryRunner.query(`DROP TABLE "partnership_accounts"`);
    await queryRunner.query(`DROP TABLE "package_credentials"`);
    await queryRunner.query(`DROP TABLE "packages"`);

    await queryRunner.query(`DROP TYPE "payment_method_enum"`);
    await queryRunner.query(`DROP TYPE "user_tier_enum"`);
  }
}

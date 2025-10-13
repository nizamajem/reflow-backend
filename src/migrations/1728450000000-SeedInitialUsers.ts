import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcryptjs";
import { Role } from "@/common/enums/role.enum";

export class SeedInitialUsers1728450000000 implements MigrationInterface {
  name = "SeedInitialUsers1728450000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const superAdminPassword = await bcrypt.hash("superadmin123", 10);
    const partnershipPassword = await bcrypt.hash("kemitraan123", 10);

    await queryRunner.query(
      `
        INSERT INTO "users" ("id", "email", "name", "password_hash", "role")
        VALUES
          ($1, $2, $3, $4, $5),
          ($6, $7, $8, $9, $10)
        ON CONFLICT ("email") DO NOTHING
      `,
      [
        "0a1a6c77-3b1d-4c80-9b9d-0a0a8e6c8701",
        "superadmin@reflow.id",
        "Super Admin",
        superAdminPassword,
        Role.SuperAdmin,
        "0d2c84a5-2ab9-4c1f-8f69-19a7a48957e4",
        "partnership@reflow.id",
        "Partnership Demo",
        partnershipPassword,
        Role.Partnership,
      ]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        DELETE FROM "users"
        WHERE "email" IN ($1, $2)
      `,
      ["superadmin@reflow.id", "partnership@reflow.id"]
    );
  }
}

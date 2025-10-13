import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { PackageEntity } from "./package.entity";
import { GeneratedAccountEntity } from "@/orders/entities/generated-account.entity";
import { USER_TIER_VALUES, UserTier } from "@/common/enums/user-tier.enum";

@Entity({ name: "package_credentials" })
export class PackageCredentialEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "package_id" })
  packageId: string;

  @ManyToOne(() => PackageEntity, (pkg) => pkg.credentials, { onDelete: "CASCADE" })
  @JoinColumn({ name: "package_id" })
  package: PackageEntity;

  @Column({ type: "enum", enum: USER_TIER_VALUES, enumName: "user_tier_enum" })
  tier: UserTier;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ default: false })
  used: boolean;

  @Column({ name: "used_at", type: "timestamptz", nullable: true })
  usedAt: Date | null;

  @Column({ name: "assigned_account_id", type: "uuid", nullable: true })
  assignedAccountId: string | null;

  @OneToOne(() => GeneratedAccountEntity, (account) => account.credential, { nullable: true })
  @JoinColumn({ name: "assigned_account_id" })
  assignedAccount: GeneratedAccountEntity | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  normalizeEmail() {
    this.email = this.email.toLowerCase();
  }
}

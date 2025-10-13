import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { PackageEntity } from "@/packages/entities/package.entity";
import { PackageCredentialEntity } from "@/packages/entities/package-credential.entity";
import { USER_TIER_VALUES, UserTier } from "@/common/enums/user-tier.enum";
import { PAYMENT_METHOD_VALUES, PaymentMethod } from "@/common/enums/payment-method.enum";
import { UserEntity } from "@/users/entities/user.entity";

@Entity({ name: "generated_accounts" })
export class GeneratedAccountEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "package_id" })
  packageId: string;

  @ManyToOne(() => PackageEntity, (pkg) => pkg.generatedAccounts, { onDelete: "SET NULL" })
  @JoinColumn({ name: "package_id" })
  package: PackageEntity;

  @Column({ name: "package_name" })
  packageName: string;

  @Column({ type: "enum", enum: USER_TIER_VALUES, enumName: "user_tier_enum" })
  tier: UserTier;

  @Column({ name: "payment_method", type: "enum", enum: PAYMENT_METHOD_VALUES, enumName: "payment_method_enum" })
  paymentMethod: PaymentMethod;

  @Column({ name: "price_paid", type: "numeric" })
  pricePaid: number;

  @Column({ name: "credential_email" })
  credentialEmail: string;

  @Column({ name: "credential_password" })
  credentialPassword: string;

  @Column({ name: "customer_name" })
  customerName: string;

  @Column({ name: "customer_phone" })
  customerPhone: string;

  @Column({ name: "customer_email", type: "varchar", length: 255, nullable: true })
  customerEmail: string | null;

  @Column({ name: "credential_id", type: "uuid" })
  credentialId: string;

  @OneToOne(() => PackageCredentialEntity, (credential) => credential.assignedAccount, {
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "credential_id" })
  credential: PackageCredentialEntity;

  @Column({ name: "created_by_user_id", type: "uuid", nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => UserEntity, { onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by_user_id" })
  createdByUser?: UserEntity | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}

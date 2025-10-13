import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserTier } from "@/common/enums/user-tier.enum";
import { PackageCredentialEntity } from "./package-credential.entity";
import { GeneratedAccountEntity } from "@/orders/entities/generated-account.entity";

@Entity({ name: "packages" })
export class PackageEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ name: "duration_label" })
  durationLabel: string;

  @Column({ type: "text" })
  description: string;

  @Column({ type: "jsonb" })
  benefits: string[];

  @Column({ type: "jsonb", name: "base_price" })
  basePrice: Record<UserTier, number>;

  @Column({ type: "jsonb" })
  price: Record<UserTier, number>;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;

  @OneToMany(() => PackageCredentialEntity, (credential) => credential.package)
  credentials: PackageCredentialEntity[];

  @OneToMany(() => GeneratedAccountEntity, (account) => account.package)
  generatedAccounts: GeneratedAccountEntity[];
}


import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
  UpdateDateColumn,
} from "typeorm";
import { UserTier } from "@/common/enums/user-tier.enum";
import { Role } from "@/common/enums/role.enum";
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

  // Kolom price boleh null
  @Column({ type: "jsonb", nullable: true })
  price: Record<UserTier, number> | null;

  // Kolom untuk menentukan role yang dapat mengakses paket ini
  @Column({
    type: "enum",
    enum: Role,
    name: "available_in",
    default: Role.Partnership,
  })
  availableIn: Role;

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

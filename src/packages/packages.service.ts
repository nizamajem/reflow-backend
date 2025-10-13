import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";
import { PackageEntity } from "./entities/package.entity";
import { DEFAULT_PACKAGES } from "./default-packages";
import { UpdatePackageDto } from "./dto/update-package.dto";
import { CreatePackageCredentialDto } from "./dto/create-package-credential.dto";
import { UpdatePackageCredentialDto } from "./dto/update-package-credential.dto";
import { UserTier } from "@/common/enums/user-tier.enum";
import { PackageCredentialEntity } from "./entities/package-credential.entity";
export type PackageResponse = {
  id: string;
  name: string;
  durationLabel: string;
  description: string;
  benefits: string[];
  basePrice: Record<UserTier, number>;
  price: Record<UserTier, number>;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PackageCredentialResponse = {
  id: string;
  packageId: string;
  tier: UserTier;
  email: string;
  password: string;
  used: boolean;
  usedAt: string | null;
  assignedAccountId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CredentialUploadFile = {
  buffer?: Buffer;
  originalname?: string;
  mimetype?: string;
};

@Injectable()
export class PackagesService implements OnModuleInit {
  private readonly logger = new Logger(PackagesService.name);

  constructor(
    @InjectRepository(PackageEntity)
    private readonly packagesRepository: Repository<PackageEntity>,
    @InjectRepository(PackageCredentialEntity)
    private readonly credentialsRepository: Repository<PackageCredentialEntity>
  ) {}

  async onModuleInit() {
    await this.ensureDefaultPackages();
  }

  async ensureDefaultPackages() {
    for (const pkg of DEFAULT_PACKAGES) {
      let entity = await this.packagesRepository.findOne({ where: { id: pkg.id } });

      if (!entity) {
        entity = this.packagesRepository.create({
          id: pkg.id,
          name: pkg.name,
          durationLabel: pkg.durationLabel,
          description: pkg.description,
          benefits: pkg.benefits,
          basePrice: pkg.basePrice,
          price: pkg.basePrice,
          active: true,
        });
        await this.packagesRepository.save(entity);
        this.logger.log(`Seeded package ${pkg.id}`);
        continue;
      }

      let updated = false;

      if (entity.name !== pkg.name) {
        entity.name = pkg.name;
        updated = true;
      }

      if (entity.durationLabel !== pkg.durationLabel) {
        entity.durationLabel = pkg.durationLabel;
        updated = true;
      }

      if (entity.description !== pkg.description) {
        entity.description = pkg.description;
        updated = true;
      }

      if (JSON.stringify(entity.benefits) !== JSON.stringify(pkg.benefits)) {
        entity.benefits = pkg.benefits;
        updated = true;
      }

      if (JSON.stringify(entity.basePrice) !== JSON.stringify(pkg.basePrice)) {
        entity.basePrice = pkg.basePrice;
        if (!entity.price) {
          entity.price = pkg.basePrice;
        }
        updated = true;
      }

      if (!entity.price) {
        entity.price = pkg.basePrice;
        updated = true;
      }

      if (updated) {
        await this.packagesRepository.save(entity);
        this.logger.log(`Updated package ${pkg.id} with latest defaults`);
      }
    }
  }

  async findAll(): Promise<PackageResponse[]> {
    const packages = await this.packagesRepository.find({
      order: { createdAt: "ASC" },
    });
    return packages.map((pkg) => this.mapPackage(pkg));
  }

  async getPackageEntity(id: string): Promise<PackageEntity> {
    const pkg = await this.packagesRepository.findOne({ where: { id } });
    if (!pkg) {
      throw new NotFoundException(`Package ${id} not found`);
    }
    return pkg;
  }

  async updateSettings(id: string, dto: UpdatePackageDto): Promise<PackageResponse> {
    const pkg = await this.packagesRepository.findOne({ where: { id } });
    if (!pkg) {
      throw new NotFoundException(`Package ${id} not found`);
    }

    let dirty = false;

    if (typeof dto.active === "boolean" && pkg.active !== dto.active) {
      pkg.active = dto.active;
      dirty = true;
    }

    if (dto.price) {
      const nextPrice: Record<UserTier, number> = { ...pkg.price };

      if (typeof dto.price.student === "number" && !Number.isNaN(dto.price.student)) {
        nextPrice.student = Math.max(0, dto.price.student);
      }

      if (typeof dto.price.public === "number" && !Number.isNaN(dto.price.public)) {
        nextPrice.public = Math.max(0, dto.price.public);
      }

      if (JSON.stringify(nextPrice) !== JSON.stringify(pkg.price)) {
        pkg.price = nextPrice;
        dirty = true;
      }
    }

    if (!dirty) {
      return this.mapPackage(pkg);
    }

    const saved = await this.packagesRepository.save(pkg);
    return this.mapPackage(saved);
  }

  async createCredential(
    packageId: string,
    dto: CreatePackageCredentialDto
  ): Promise<PackageCredentialResponse> {
    const pkg = await this.packagesRepository.findOne({ where: { id: packageId } });
    if (!pkg) {
      throw new NotFoundException(`Package ${packageId} not found`);
    }

    const email = dto.email.toLowerCase();

    const duplicate = await this.credentialsRepository.findOne({
      where: { packageId, tier: dto.tier, email },
    });

    if (duplicate) {
      throw new BadRequestException("Credential already exists for this package and tier with the provided email.");
    }

    const credential = this.credentialsRepository.create({
      packageId,
      package: pkg,
      tier: dto.tier,
      email,
      password: dto.password,
      used: false,
    });

    const saved = await this.credentialsRepository.save(credential);
    return this.mapCredential(saved);
  }

  async importCredentialsFromCsv(file: CredentialUploadFile | undefined) {
    if (!file) {
      throw new BadRequestException("No file was uploaded.");
    }

    const buffer = file.buffer;
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException("Uploaded file is empty.");
    }

    const content = buffer.toString("utf8");
    const parsed = this.parseCredentialCsv(content);

    if (parsed.rows.length === 0) {
      throw new BadRequestException("No credentials found in the uploaded file.");
    }

    if (parsed.errors.length > 0) {
      throw new BadRequestException(parsed.errors.join("; "));
    }

    const imported = await this.persistImportedCredentials(parsed.rows);
    return {
      count: imported.length,
      inserted: imported.map((credential) => this.mapCredential(credential)),
    };
  }

  async updateCredential(
    id: string,
    dto: UpdatePackageCredentialDto
  ): Promise<PackageCredentialResponse> {
    const credential = await this.credentialsRepository.findOne({ where: { id } });
    if (!credential) {
      throw new NotFoundException(`Credential ${id} not found`);
    }

    if (dto.tier) {
      credential.tier = dto.tier;
    }

    if (dto.email) {
      const email = dto.email.toLowerCase();
      const exists = await this.credentialsRepository.findOne({
        where: {
          packageId: credential.packageId,
          tier: dto.tier ?? credential.tier,
          email,
          id: Not(credential.id),
        },
      });

      if (exists) {
        throw new BadRequestException("Credential already exists for this package and tier with the provided email.");
      }
      credential.email = email;
    }

    if (dto.password) {
      credential.password = dto.password;
    }

    const saved = await this.credentialsRepository.save(credential);
    return this.mapCredential(saved);
  }

  async deleteCredential(id: string): Promise<void> {
    const credential = await this.credentialsRepository.findOne({ where: { id } });
    if (!credential) {
      throw new NotFoundException(`Credential ${id} not found`);
    }
    await this.credentialsRepository.remove(credential);
  }

  async findAllCredentials(): Promise<PackageCredentialResponse[]> {
    const credentials = await this.credentialsRepository.find({
      order: { createdAt: "DESC" },
    });
    return credentials.map((credential) => this.mapCredential(credential));
  }

  async findCredentialsByPackage(packageId: string): Promise<PackageCredentialResponse[]> {
    const credentials = await this.credentialsRepository.find({
      where: { packageId },
      order: { createdAt: "DESC" },
    });
    return credentials.map((credential) => this.mapCredential(credential));
  }

  async findAvailableCredential(packageId: string, tier: UserTier): Promise<PackageCredentialEntity | null> {
    return this.credentialsRepository.findOne({
      where: { packageId, tier, used: false },
      order: { createdAt: "ASC" },
    });
  }

  async markCredentialAsUsed(id: string, accountId: string) {
    const now = new Date();
    await this.credentialsRepository.update(
      { id },
      {
        used: true,
        usedAt: now,
        assignedAccountId: accountId,
        updatedAt: now,
      }
    );
  }

  mapPackage(pkg: PackageEntity): PackageResponse {
    return {
      id: pkg.id,
      name: pkg.name,
      durationLabel: pkg.durationLabel,
      description: pkg.description,
      benefits: pkg.benefits,
      basePrice: pkg.basePrice,
      price: pkg.price,
      active: pkg.active,
      createdAt: pkg.createdAt?.toISOString?.() ?? new Date().toISOString(),
      updatedAt: pkg.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };
  }

  mapCredential(credential: PackageCredentialEntity): PackageCredentialResponse {
    return {
      id: credential.id,
      packageId: credential.packageId,
      tier: credential.tier,
      email: credential.email,
      password: credential.password,
      used: credential.used,
      usedAt: credential.usedAt ? credential.usedAt.toISOString() : null,
      assignedAccountId: credential.assignedAccountId,
      createdAt: credential.createdAt.toISOString(),
      updatedAt: credential.updatedAt.toISOString(),
    };
  }

  private parseCredentialCsv(content: string) {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const result: {
      rows: Array<{
        packageId: string;
        tier: UserTier;
        email: string;
        password: string;
        rowNumber: number;
      }>;
      errors: string[];
    } = { rows: [], errors: [] };

    if (lines.length === 0) {
      return result;
    }

    const headerLine = lines.shift()!.replace(/^\ufeff/, "");
    const headerCells = headerLine
      .split(",")
      .map((cell) => cell.trim().toLowerCase().replace(/[\s_-]+/g, ""));
    const requiredHeaders = ["packageid", "tier", "email", "password"];

    const headerIndex: Record<string, number> = {};
    requiredHeaders.forEach((key) => {
      const index = headerCells.indexOf(key);
      if (index === -1) {
        result.errors.push(`Missing column "${key}" in header.`);
      } else {
        headerIndex[key] = index;
      }
    });

    if (result.errors.length > 0) {
      return result;
    }

    lines.forEach((line, idx) => {
      const cells = line.split(",").map((cell) => cell.trim());
      const rowNumber = idx + 2; // account for header line

      const packageId = cells[headerIndex.packageid] ?? "";
      const tier = cells[headerIndex.tier]?.toLowerCase();
      const email = cells[headerIndex.email]?.toLowerCase();
      const password = cells[headerIndex.password] ?? "";

      const rowErrors: string[] = [];

      if (!packageId) {
        rowErrors.push(`Row ${rowNumber}: packageId is required.`);
      }
      if (!tier || !["student", "public"].includes(tier)) {
        rowErrors.push(`Row ${rowNumber}: tier must be either "student" or "public".`);
      }
      if (!email) {
        rowErrors.push(`Row ${rowNumber}: email is required.`);
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        rowErrors.push(`Row ${rowNumber}: email "${email}" is invalid.`);
      }
      if (!password || password.length < 6) {
        rowErrors.push(`Row ${rowNumber}: password must be at least 6 characters.`);
      }

      if (rowErrors.length > 0) {
        result.errors.push(...rowErrors);
        return;
      }

      result.rows.push({
        packageId,
        tier: tier as UserTier,
        email,
        password,
        rowNumber,
      });
    });

    // detect duplicates within uploaded file
    const seen = new Set<string>();
    for (const row of result.rows) {
      const signature = `${row.packageId}::${row.tier}::${row.email}`;
      if (seen.has(signature)) {
        result.errors.push(
          `Duplicate credential for package "${row.packageId}" tier "${row.tier}" and email "${row.email}".`
        );
      } else {
        seen.add(signature);
      }
    }

    return result;
  }

  private async persistImportedCredentials(
    rows: Array<{
      packageId: string;
      tier: UserTier;
      email: string;
      password: string;
      rowNumber: number;
    }>
  ) {
    const created: PackageCredentialEntity[] = [];

    await this.credentialsRepository.manager.transaction(async (manager) => {
      const packagesRepo = manager.getRepository(PackageEntity);
      const credentialsRepo = manager.getRepository(PackageCredentialEntity);

      const packageIds = Array.from(new Set(rows.map((row) => row.packageId)));
      const packages = await packagesRepo.findBy({ id: In(packageIds) });
      const packagesById = new Map(packages.map((pkg) => [pkg.id, pkg]));

      packageIds.forEach((id) => {
        if (!packagesById.has(id)) {
          throw new BadRequestException(`Package "${id}" was not found.`);
        }
      });

      for (const row of rows) {
        const pkg = packagesById.get(row.packageId);
        if (!pkg) {
          throw new BadRequestException(`Row ${row.rowNumber}: package "${row.packageId}" was not found.`);
        }

        const existing = await credentialsRepo.findOne({
          where: {
            packageId: row.packageId,
            tier: row.tier,
            email: row.email,
          },
        });

        if (existing) {
          throw new BadRequestException(
            `Row ${row.rowNumber}: credential already exists for package "${row.packageId}", tier "${row.tier}", and email "${row.email}".`
          );
        }

        const credential = credentialsRepo.create({
          packageId: pkg.id,
          package: pkg,
          tier: row.tier,
          email: row.email,
          password: row.password,
          used: false,
        });

        const saved = await credentialsRepo.save(credential);
        created.push(saved);
      }
    });

    return created;
  }
}

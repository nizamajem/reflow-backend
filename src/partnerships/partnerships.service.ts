import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PartnershipAccountEntity } from "./entities/partnership-account.entity";
import { CreatePartnershipAccountDto } from "./dto/create-partnership-account.dto";
import { UpdatePartnershipAccountDto } from "./dto/update-partnership-account.dto";
import { UsersService } from "@/users/users.service";

export type PartnershipAccountResponse = {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class PartnershipsService {
  constructor(
    @InjectRepository(PartnershipAccountEntity)
    private readonly repository: Repository<PartnershipAccountEntity>,
    private readonly usersService: UsersService
  ) {}

  async findAll(): Promise<PartnershipAccountResponse[]> {
    const accounts = await this.repository.find({
      order: { createdAt: "DESC" },
    });
    return accounts.map((account) => this.mapAccount(account));
  }

  async create(dto: CreatePartnershipAccountDto): Promise<PartnershipAccountResponse> {
    const email = dto.email.toLowerCase();
    const exists = await this.repository.findOne({ where: { email } });
    if (exists) {
      throw new BadRequestException("A partnership account already exists with that email.");
    }
    const entity = this.repository.create({
      name: dto.name.trim(),
      email,
      password: dto.password,
    });
    const saved = await this.repository.save(entity);
    try {
      await this.usersService.createPartnershipUser({
        name: dto.name,
        email,
        password: dto.password,
      });
    } catch (error) {
      await this.repository.remove(saved);
      throw error;
    }
    return this.mapAccount(saved);
  }

  async update(id: string, dto: UpdatePartnershipAccountDto): Promise<PartnershipAccountResponse> {
    const account = await this.repository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Partnership account ${id} not found`);
    }
    const previousEmail = account.email;

    const updatesForUser: { name?: string; email?: string; password?: string } = {};

    if (dto.name) {
      account.name = dto.name.trim();
      updatesForUser.name = account.name;
    }

    if (dto.email) {
      const email = dto.email.toLowerCase();
      const exists = await this.repository.findOne({
        where: { email },
      });
      if (exists && exists.id !== id) {
        throw new BadRequestException("Another partnership account already uses that email.");
      }
      account.email = email;
      updatesForUser.email = email;
    }

    if (dto.password) {
      account.password = dto.password;
      updatesForUser.password = dto.password;
    }

    const saved = await this.repository.save(account);
    if (Object.keys(updatesForUser).length > 0) {
      await this.usersService.updatePartnershipUserByEmail(previousEmail, updatesForUser);
    }
    return this.mapAccount(saved);
  }

  async remove(id: string): Promise<void> {
    const account = await this.repository.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Partnership account ${id} not found`);
    }
    await this.repository.remove(account);
    await this.usersService.deleteUserByEmail(account.email);
  }

  mapAccount(account: PartnershipAccountEntity): PartnershipAccountResponse {
    return {
      id: account.id,
      name: account.name,
      email: account.email,
      password: account.password,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
    };
  }
}

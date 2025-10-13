import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { UserEntity } from "./entities/user.entity";
import { Role } from "@/common/enums/role.enum";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async validateUser(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.findByEmail(email);
    if (!user) {
      return null;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    return isMatch ? user : null;
  }

  async findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find();
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async createPartnershipUser(params: { name: string; email: string; password: string }) {
    const email = params.email.toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new BadRequestException("A user already exists with that email.");
    }
    const passwordHash = await bcrypt.hash(params.password, 10);
    const entity = this.usersRepository.create({
      name: params.name.trim(),
      email,
      passwordHash,
      role: Role.Partnership,
    });
    return this.usersRepository.save(entity);
  }

  async updatePartnershipUserByEmail(currentEmail: string, updates: { name?: string; email?: string; password?: string }) {
    const email = currentEmail.toLowerCase();
    const user = await this.findByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email ${currentEmail} not found`);
    }

    if (updates.name) {
      user.name = updates.name.trim();
    }
    if (updates.email) {
      const newEmail = updates.email.toLowerCase();
      if (newEmail !== user.email) {
        const existing = await this.findByEmail(newEmail);
        if (existing && existing.id !== user.id) {
          throw new BadRequestException("Another user already uses that email.");
        }
        user.email = newEmail;
      }
    }
    if (updates.password) {
      user.passwordHash = await bcrypt.hash(updates.password, 10);
    }

    return this.usersRepository.save(user);
  }

  async deleteUserByEmail(email: string) {
    const normalized = email.toLowerCase();
    const user = await this.findByEmail(normalized);
    if (!user) {
      return;
    }
    await this.usersRepository.remove(user);
  }

  async updateProfile(userId: string, updates: { name?: string; email?: string; password?: string }) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (updates.name) {
      user.name = updates.name.trim();
    }
    if (updates.email) {
      const normalized = updates.email.toLowerCase();
      if (normalized !== user.email) {
        const duplicate = await this.findByEmail(normalized);
        if (duplicate && duplicate.id !== user.id) {
          throw new BadRequestException("Another account already uses that email.");
        }
        user.email = normalized;
      }
    }
    if (updates.password) {
      user.passwordHash = await bcrypt.hash(updates.password, 10);
    }

    const saved = await this.usersRepository.save(user);
    return saved;
  }
}

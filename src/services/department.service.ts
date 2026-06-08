import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  async findAll(): Promise<Department[]> {
    return this.departmentRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Department> {
    const dept = await this.departmentRepo.findOne({ where: { id } });
    if (!dept) {
      throw new NotFoundException(`部门 ${id} 不存在`);
    }
    return dept;
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const dept = this.departmentRepo.create(dto);
    return this.departmentRepo.save(dept);
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const dept = await this.findOne(id);
    Object.assign(dept, dto);
    return this.departmentRepo.save(dept);
  }

  async remove(id: string): Promise<void> {
    const dept = await this.findOne(id);
    await this.departmentRepo.remove(dept);
  }
}

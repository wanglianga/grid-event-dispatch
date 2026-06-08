import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { DepartmentType, UserRole } from '../common/enums';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedDepartments();
    await this.seedUsers();
  }

  private async seedDepartments() {
    const count = await this.departmentRepo.count();
    if (count > 0) {
      this.logger.log('部门数据已存在，跳过初始化');
      return;
    }

    const departments = [
      { name: '城市管理局', type: DepartmentType.CHENGGUAN, contactPerson: '张主任', contactPhone: '13800000001' },
      { name: '市政工程管理处', type: DepartmentType.MUNICIPAL, contactPerson: '李主任', contactPhone: '13800000002' },
      { name: '物业服务中心', type: DepartmentType.PROPERTY, contactPerson: '王经理', contactPhone: '13800000003' },
      { name: '交通警察大队', type: DepartmentType.TRAFFIC_POLICE, contactPerson: '赵队长', contactPhone: '13800000004' },
      { name: '环境保护局', type: DepartmentType.ENVIRONMENTAL, contactPerson: '刘局长', contactPhone: '13800000005' },
    ];

    for (const dept of departments) {
      await this.departmentRepo.save(this.departmentRepo.create(dept));
    }
    this.logger.log(`已初始化 ${departments.length} 个部门数据`);
  }

  private async seedUsers() {
    const count = await this.userRepo.count();
    if (count > 0) {
      this.logger.log('用户数据已存在，跳过初始化');
      return;
    }

    const departments = await this.departmentRepo.find();
    const deptMap = new Map<DepartmentType, Department>(
      departments.map((d) => [d.type, d]),
    );

    const cgDept = deptMap.get(DepartmentType.CHENGGUAN);
    const szDept = deptMap.get(DepartmentType.MUNICIPAL);
    const wyDept = deptMap.get(DepartmentType.PROPERTY);
    const jjDept = deptMap.get(DepartmentType.TRAFFIC_POLICE);

    const users = [
      { name: '系统管理员', username: 'admin', role: UserRole.ADMIN, phone: '13900000000' },
      { name: '指挥中心-调度员', username: 'command01', role: UserRole.COMMAND_CENTER, phone: '13900000001' },
      { name: '网格员-王小明', username: 'grid01', role: UserRole.GRID_WORKER, phone: '13900000002', gridCode: 'GRID001' },
      { name: '网格员-李小红', username: 'grid02', role: UserRole.GRID_WORKER, phone: '13900000003', gridCode: 'GRID002' },
      { name: '居民-张先生', username: 'resident01', role: UserRole.RESIDENT, phone: '13900000010' },
      { name: '居民-李女士', username: 'resident02', role: UserRole.RESIDENT, phone: '13900000011' },
      {
        name: '城管-执法员1',
        username: 'cg01',
        role: UserRole.DEPARTMENT_STAFF,
        phone: '13900000020',
        departmentId: cgDept?.id || null,
      },
      {
        name: '市政-维修工1',
        username: 'sz01',
        role: UserRole.DEPARTMENT_STAFF,
        phone: '13900000030',
        departmentId: szDept?.id || null,
      },
      {
        name: '物业-客服1',
        username: 'wy01',
        role: UserRole.DEPARTMENT_STAFF,
        phone: '13900000040',
        departmentId: wyDept?.id || null,
      },
      {
        name: '交警-警员1',
        username: 'jj01',
        role: UserRole.DEPARTMENT_STAFF,
        phone: '13900000050',
        departmentId: jjDept?.id || null,
      },
    ];

    for (const user of users) {
      await this.userRepo.save(this.userRepo.create(user));
    }
    this.logger.log(`已初始化 ${users.length} 个用户数据`);
  }
}

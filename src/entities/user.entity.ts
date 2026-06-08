import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../common/enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: UserRole.RESIDENT,
  })
  role: UserRole;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string | null;

  @Column({ length: 50, nullable: true })
  gridCode: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

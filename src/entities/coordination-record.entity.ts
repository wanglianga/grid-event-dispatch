import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CoordinationStatus } from '../common/enums';

@Entity('coordination_records')
export class CoordinationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: CoordinationStatus.PENDING_COORDINATION,
  })
  status: CoordinationStatus;

  @Column({ type: 'uuid', nullable: true })
  leadDepartmentId: string | null;

  @Column({ length: 100, nullable: true })
  leadDepartmentName: string;

  @Column({ type: 'simple-array', nullable: true })
  collaborativeDepartmentIds: string[];

  @Column({ type: 'simple-array', nullable: true })
  collaborativeDepartmentNames: string[];

  @Column({ type: 'text', nullable: true })
  coordinationRemark: string;

  @Column({ type: 'uuid', nullable: true })
  operatorId: string | null;

  @Column({ length: 50, nullable: true })
  operatorName: string;

  @Column({ type: 'datetime', nullable: true })
  coordinatedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

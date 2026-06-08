import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { ReturnReason } from '../common/enums';

@Entity('return_records')
export class ReturnRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  fromDepartmentId: string | null;

  @Column({ length: 100, nullable: true })
  fromDepartmentName: string;

  @Column({ type: 'uuid', nullable: true })
  toDepartmentId: string | null;

  @Column({ length: 100, nullable: true })
  toDepartmentName: string;

  @Column({
    type: 'varchar',
    length: 50,
  })
  returnReason: ReturnReason;

  @Column({ type: 'text', nullable: true })
  returnRemark: string;

  @Column({ type: 'uuid', nullable: true })
  operatorId: string | null;

  @Column({ length: 50, nullable: true })
  operatorName: string;

  @Column({ type: 'int', default: 1 })
  returnRound: number;

  @CreateDateColumn()
  createdAt: Date;
}

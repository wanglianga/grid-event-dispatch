import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import {
  EventStatus,
  EventType,
  UrgencyLevel,
  ReturnReason,
} from '../common/enums';
import { EventLog } from './event-log.entity';
import { Evaluation } from './evaluation.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: EventStatus.PENDING,
  })
  status: EventStatus;

  @Column({
    type: 'varchar',
    length: 30,
  })
  eventType: EventType;

  @Column({ length: 500 })
  description: string;

  @Column({ length: 200 })
  address: string;

  @Column({ type: 'float', nullable: true })
  latitude: number | null;

  @Column({ type: 'float', nullable: true })
  longitude: number | null;

  @Column({ type: 'simple-array', nullable: true })
  photos: string[];

  @Column({
    type: 'varchar',
    length: 20,
    default: UrgencyLevel.MEDIUM,
  })
  urgency: UrgencyLevel;

  @Column({ type: 'uuid', nullable: true })
  reporterId: string | null;

  @Column({ length: 50, nullable: true })
  reporterName: string;

  @Column({ length: 20, nullable: true })
  reporterPhone: string;

  @Column({ type: 'uuid', nullable: true })
  gridWorkerId: string | null;

  @Column({ type: 'text', nullable: true })
  verifyRemark: string;

  @Column({ type: 'uuid', nullable: true })
  assignedDepartmentId: string | null;

  @Column({ type: 'simple-array', nullable: true })
  collaborativeDepartmentIds: string[];

  @Column({ type: 'datetime', nullable: true })
  deadline: Date | null;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  returnReason: ReturnReason | null;

  @Column({ type: 'text', nullable: true })
  returnRemark: string;

  @Column({ type: 'text', nullable: true })
  processResult: string;

  @Column({ type: 'simple-array', nullable: true })
  completionMaterials: string[];

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  duplicateOfEventId: string | null;

  @Column({ type: 'int', default: 0 })
  escalateCount: number;

  @Column({ default: false })
  isAddressClear: boolean;

  @Column({ type: 'text', nullable: true })
  addressRemark: string;

  @Column({ type: 'text', nullable: true })
  rejectRemark: string;

  @OneToMany(() => EventLog, (log) => log.event)
  @JoinColumn()
  logs: EventLog[];

  @ManyToOne(() => Evaluation, { nullable: true })
  @JoinColumn()
  evaluation: Evaluation;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

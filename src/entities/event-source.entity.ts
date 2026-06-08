import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Evaluation } from './evaluation.entity';
import { SourceCallbackStatus, MergeStrategy } from '../common/enums';

@Entity('event_sources')
export class EventSource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @Column({ type: 'uuid', nullable: true })
  originalEventId: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: MergeStrategy.AUTO,
  })
  mergeStrategy: MergeStrategy;

  @Column({ type: 'uuid', nullable: true })
  reporterId: string | null;

  @Column({ length: 50, nullable: true })
  reporterName: string;

  @Column({ length: 20, nullable: true })
  reporterPhone: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  photos: string[];

  @Column({
    type: 'varchar',
    length: 30,
    default: SourceCallbackStatus.PENDING,
  })
  callbackStatus: SourceCallbackStatus;

  @Column({ type: 'text', nullable: true })
  callbackRemark: string;

  @Column({ type: 'datetime', nullable: true })
  callbackAt: Date | null;

  @OneToOne(() => Evaluation, { nullable: true })
  @JoinColumn()
  evaluation: Evaluation | null;

  @Column({ type: 'uuid', nullable: true })
  mergedByOperatorId: string | null;

  @Column({ length: 50, nullable: true })
  mergedByOperatorName: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

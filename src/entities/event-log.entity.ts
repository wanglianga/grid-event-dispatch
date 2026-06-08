import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EventStatus } from '../common/enums';
import { Event } from './event.entity';

@Entity('event_logs')
export class EventLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.logs)
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  fromStatus: EventStatus | null;

  @Column({
    type: 'varchar',
    length: 30,
  })
  toStatus: EventStatus;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @Column({ type: 'uuid', nullable: true })
  operatorId: string | null;

  @Column({ length: 50, nullable: true })
  operatorName: string;

  @CreateDateColumn()
  createdAt: Date;
}

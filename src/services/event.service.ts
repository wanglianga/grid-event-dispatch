import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Brackets } from 'typeorm';
import { Event } from '../entities/event.entity';
import { EventLog } from '../entities/event-log.entity';
import { Evaluation } from '../entities/evaluation.entity';
import { Department } from '../entities/department.entity';
import {
  CreateEventDto,
  VerifyEventDto,
  AssignEventDto,
  AutoAssignEventDto,
  ProcessEventDto,
  ReturnEventDto,
  CompleteEventDto,
  EvaluateEventDto,
  RejectCompletionDto,
  MarkDuplicateDto,
  EscalateEventDto,
  QueryEventDto,
} from '../dto';
import {
  EventStatus,
  EventType,
  URGENCY_DEADLINE_HOURS,
  EVENT_TYPE_TO_DEPARTMENT,
  DepartmentType,
} from '../common/enums';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(EventLog)
    private readonly eventLogRepo: Repository<EventLog>,
    @InjectRepository(Evaluation)
    private readonly evaluationRepo: Repository<Evaluation>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  private async createLog(
    eventId: string,
    fromStatus: EventStatus | null,
    toStatus: EventStatus,
    remark?: string,
    operatorId?: string,
    operatorName?: string,
  ): Promise<EventLog> {
    const log = this.eventLogRepo.create({
      eventId,
      fromStatus,
      toStatus,
      remark,
      operatorId: operatorId || null,
      operatorName: operatorName || null,
    });
    return this.eventLogRepo.save(log);
  }

  async findAll(query: QueryEventDto): Promise<{ data: Event[]; total: number; page: number; pageSize: number }> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const qb = this.eventRepo.createQueryBuilder('event');

    if (query.eventType) {
      qb.andWhere('event.eventType = :eventType', { eventType: query.eventType });
    }
    if (query.status) {
      qb.andWhere('event.status = :status', { status: query.status });
    }
    if (query.assignedDepartmentId) {
      qb.andWhere('event.assignedDepartmentId = :assignedDepartmentId', {
        assignedDepartmentId: query.assignedDepartmentId,
      });
    }
    if (query.gridWorkerId) {
      qb.andWhere('event.gridWorkerId = :gridWorkerId', { gridWorkerId: query.gridWorkerId });
    }
    if (query.urgency) {
      qb.andWhere('event.urgency = :urgency', { urgency: query.urgency });
    }

    qb.orderBy('event.createdAt', 'DESC');
    qb.skip(skip).take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, pageSize };
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventRepo.findOne({
      where: { id },
      relations: ['logs', 'evaluation'],
    });
    if (!event) {
      throw new NotFoundException(`事件 ${id} 不存在`);
    }
    return event;
  }

  async create(dto: CreateEventDto): Promise<Event> {
    const event = this.eventRepo.create({
      ...dto,
      status: EventStatus.PENDING,
    });
    const saved = await this.eventRepo.save(event);
    await this.createLog(saved.id, null, EventStatus.PENDING, '事件创建');
    return saved;
  }

  async verify(id: string, dto: VerifyEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (![EventStatus.PENDING, EventStatus.ADDRESS_UNCLEAR].includes(event.status as EventStatus)) {
      throw new BadRequestException(`当前状态 ${event.status} 不允许核实操作`);
    }

    const fromStatus = event.status as EventStatus;
    event.gridWorkerId = dto.gridWorkerId;
    event.verifyRemark = dto.verifyRemark || null;
    event.isAddressClear = dto.isAddressClear !== undefined ? dto.isAddressClear : true;
    event.addressRemark = dto.addressRemark || null;

    if (!event.isAddressClear) {
      event.status = EventStatus.ADDRESS_UNCLEAR;
    } else {
      event.status = EventStatus.VERIFIED;
    }

    const saved = await this.eventRepo.save(event);
    await this.createLog(saved.id, fromStatus, saved.status as EventStatus, dto.verifyRemark, dto.gridWorkerId);
    return saved;
  }

  async autoAssign(id: string, dto: AutoAssignEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (![EventStatus.VERIFIED, EventStatus.RETURNED, EventStatus.RESPONSIBILITY_UNCLEAR].includes(event.status as EventStatus)) {
      throw new BadRequestException(`当前状态 ${event.status} 不允许自动派单`);
    }

    const deptType = EVENT_TYPE_TO_DEPARTMENT[event.eventType as EventType];
    if (!deptType || deptType === DepartmentType.OTHER) {
      event.status = EventStatus.RESPONSIBILITY_UNCLEAR;
      const saved = await this.eventRepo.save(event);
      await this.createLog(saved.id, event.status as EventStatus, EventStatus.RESPONSIBILITY_UNCLEAR, '权责不明，无法自动派单');
      return saved;
    }

    const dept = await this.departmentRepo.findOne({ where: { type: deptType } });
    if (!dept) {
      event.status = EventStatus.RESPONSIBILITY_UNCLEAR;
      const saved = await this.eventRepo.save(event);
      await this.createLog(saved.id, event.status as EventStatus, EventStatus.RESPONSIBILITY_UNCLEAR, '未找到对应责任部门');
      return saved;
    }

    const fromStatus = event.status as EventStatus;
    event.assignedDepartmentId = dept.id;
    event.status = EventStatus.ASSIGNED;
    const deadlineHours = URGENCY_DEADLINE_HOURS[event.urgency];
    event.deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

    const saved = await this.eventRepo.save(event);
    await this.createLog(saved.id, fromStatus, EventStatus.ASSIGNED, `自动派单至 ${dept.name}${dto.remark ? `: ${dto.remark}` : ''}`);
    return saved;
  }

  async assign(id: string, dto: AssignEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (![EventStatus.VERIFIED, EventStatus.RETURNED, EventStatus.RESPONSIBILITY_UNCLEAR, EventStatus.REJECTED].includes(event.status as EventStatus)) {
      throw new BadRequestException(`当前状态 ${event.status} 不允许手动派单`);
    }

    const fromStatus = event.status as EventStatus;
    event.assignedDepartmentId = dto.assignedDepartmentId;
    event.collaborativeDepartmentIds = dto.collaborativeDepartmentIds || null;
    event.status = EventStatus.ASSIGNED;
    const deadlineHours = URGENCY_DEADLINE_HOURS[event.urgency];
    event.deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

    const saved = await this.eventRepo.save(event);
    await this.createLog(saved.id, fromStatus, EventStatus.ASSIGNED, dto.remark);
    return saved;
  }

  async process(id: string, dto: ProcessEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (![EventStatus.ASSIGNED, EventStatus.PROCESSING].includes(event.status as EventStatus)) {
      throw new BadRequestException(`当前状态 ${event.status} 不允许部门处理`);
    }

    const fromStatus = event.status as EventStatus;
    event.status = EventStatus.PROCESSING;
    event.processResult = dto.processResult || null;

    const saved = await this.eventRepo.save(event);
    await this.createLog(saved.id, fromStatus, EventStatus.PROCESSING, dto.processResult, dto.operatorId);
    return saved;
  }

  async returnEvent(id: string, dto: ReturnEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (![EventStatus.ASSIGNED, EventStatus.PROCESSING].includes(event.status as EventStatus)) {
      throw new BadRequestException(`当前状态 ${event.status} 不允许退回`);
    }

    const fromStatus = event.status as EventStatus;
    event.status = EventStatus.RETURNED;
    event.returnReason = dto.returnReason;
    event.returnRemark = dto.returnRemark;

    const saved = await this.eventRepo.save(event);
    await this.createLog(saved.id, fromStatus, EventStatus.RETURNED, `退回原因: ${dto.returnReason}, 备注: ${dto.returnRemark}`, dto.operatorId);
    return saved;
  }

  async complete(id: string, dto: CompleteEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (![EventStatus.PROCESSING, EventStatus.ASSIGNED].includes(event.status as EventStatus)) {
      throw new BadRequestException(`当前状态 ${event.status} 不允许办结`);
    }

    const fromStatus = event.status as EventStatus;
    event.status = EventStatus.COMPLETED;
    event.processResult = dto.processResult;
    event.completionMaterials = dto.completionMaterials || null;
    event.completedAt = new Date();

    const saved = await this.eventRepo.save(event);
    await this.createLog(saved.id, fromStatus, EventStatus.COMPLETED, dto.processResult, dto.operatorId);
    return saved;
  }

  async evaluate(id: string, dto: EvaluateEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if (event.status !== EventStatus.COMPLETED && event.status !== EventStatus.REJECTED) {
      throw new BadRequestException(`当前状态 ${event.status} 不允许评价`);
    }

    const evaluation = this.evaluationRepo.create({
      eventId: id,
      satisfaction: dto.satisfaction,
      isApproved: dto.isApproved,
      comment: dto.comment || null,
      evaluatorId: dto.evaluatorId || null,
      evaluatorName: dto.evaluatorName || null,
    });
    const savedEval = await this.evaluationRepo.save(evaluation);

    const fromStatus = event.status as EventStatus;
    if (dto.isApproved) {
      event.status = EventStatus.CONFIRMED;
    } else {
      event.status = EventStatus.REJECTED;
      event.rejectRemark = dto.rejectRemark || null;
    }
    event.evaluation = savedEval;

    const saved = await this.eventRepo.save(event);
    await this.createLog(saved.id, fromStatus, saved.status as EventStatus, `满意度: ${dto.satisfaction}, 认可: ${dto.isApproved}`, dto.evaluatorId, dto.evaluatorName);
    return saved;
  }

  async rejectCompletion(id: string, dto: RejectCompletionDto): Promise<Event> {
    const event = await this.findOne(id);

    if (event.status !== EventStatus.COMPLETED) {
      throw new BadRequestException(`当前状态 ${event.status} 不允许不认可办结`);
    }

    const fromStatus = event.status as EventStatus;
    event.status = EventStatus.REJECTED;
    event.rejectRemark = dto.rejectRemark;

    const saved = await this.eventRepo.save(event);
    await this.createLog(saved.id, fromStatus, EventStatus.REJECTED, `不认可办结: ${dto.rejectRemark}`);
    return saved;
  }

  async escalate(id: string, dto: EscalateEventDto): Promise<Event> {
    const event = await this.findOne(id);

    if ([EventStatus.CLOSED, EventStatus.CONFIRMED, EventStatus.DUPLICATE].includes(event.status as EventStatus)) {
      throw new BadRequestException(`当前状态 ${event.status} 不允许升级督办`);
    }

    const fromStatus = event.status as EventStatus;
    event.status = EventStatus.ESCALATED;
    event.escalateCount = (event.escalateCount || 0) + 1;

    const saved = await this.eventRepo.save(event);
    await this.createLog(saved.id, fromStatus, EventStatus.ESCALATED, `升级督办第 ${saved.escalateCount} 次${dto.remark ? `: ${dto.remark}` : ''}`);
    return saved;
  }

  async markDuplicate(id: string, dto: MarkDuplicateDto): Promise<Event> {
    const event = await this.findOne(id);

    if (dto.duplicateOfEventId === id) {
      throw new BadRequestException('不能将事件标记为自身的重复事件');
    }

    const originalEvent = await this.eventRepo.findOne({ where: { id: dto.duplicateOfEventId } });
    if (!originalEvent) {
      throw new NotFoundException(`原事件 ${dto.duplicateOfEventId} 不存在`);
    }

    const fromStatus = event.status as EventStatus;
    event.status = EventStatus.DUPLICATE;
    event.duplicateOfEventId = dto.duplicateOfEventId;

    const saved = await this.eventRepo.save(event);
    await this.createLog(saved.id, fromStatus, EventStatus.DUPLICATE, `重复事件: ${dto.duplicateOfEventId}`);
    return saved;
  }

  async checkDuplicate(eventType: EventType, address: string): Promise<{ isDuplicate: boolean; duplicateEvents: Event[] }> {
    const qb = this.eventRepo.createQueryBuilder('event');
    qb.where('event.eventType = :eventType', { eventType });
    qb.andWhere('event.address LIKE :address', { address: `%${address}%` });
    qb.andWhere(
      new Brackets((subQb) => {
        subQb
          .where('event.status IN (:...openStatuses)', {
            openStatuses: [
              EventStatus.PENDING,
              EventStatus.VERIFIED,
              EventStatus.ASSIGNED,
              EventStatus.PROCESSING,
              EventStatus.ESCALATED,
              EventStatus.RETURNED,
              EventStatus.ADDRESS_UNCLEAR,
              EventStatus.RESPONSIBILITY_UNCLEAR,
            ],
          })
          .orWhere('event.status = :completedStatus AND event.completedAt > :recentDate', {
            completedStatus: EventStatus.COMPLETED,
            recentDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          });
      }),
    );

    const duplicateEvents = await qb.getMany();
    return { isDuplicate: duplicateEvents.length > 0, duplicateEvents };
  }

  async checkAndEscalateOverdue(): Promise<number> {
    const now = new Date();
    const overdueEvents = await this.eventRepo
      .createQueryBuilder('event')
      .where('event.deadline IS NOT NULL')
      .andWhere('event.deadline < :now', { now })
      .andWhere('event.status IN (:...statuses)', {
        statuses: [EventStatus.ASSIGNED, EventStatus.PROCESSING],
      })
      .getMany();

    let count = 0;
    for (const event of overdueEvents) {
      const fromStatus = event.status as EventStatus;
      event.status = EventStatus.ESCALATED;
      event.escalateCount = (event.escalateCount || 0) + 1;
      await this.eventRepo.save(event);
      await this.createLog(
        event.id,
        fromStatus,
        EventStatus.ESCALATED,
        `超时自动升级督办，第 ${event.escalateCount} 次`,
      );
      count++;
    }
    return count;
  }
}

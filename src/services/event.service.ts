import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Brackets, In } from 'typeorm';
import { Event } from '../entities/event.entity';
import { EventLog } from '../entities/event-log.entity';
import { Evaluation } from '../entities/evaluation.entity';
import { Department } from '../entities/department.entity';
import { User } from '../entities/user.entity';
import { EventSource } from '../entities/event-source.entity';
import { ReturnRecord } from '../entities/return-record.entity';
import { CoordinationRecord } from '../entities/coordination-record.entity';
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
  MergeEventsDto,
  CoordinateAssignDto,
  UpdateSourceCallbackDto,
  EvaluateSourceDto,
} from '../dto';
import {
  EventStatus,
  EventType,
  URGENCY_DEADLINE_HOURS,
  EVENT_TYPE_TO_DEPARTMENT,
  DepartmentType,
  CoordinationStatus,
  MergeStrategy,
  SourceCallbackStatus,
  ReturnReason,
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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(EventSource)
    private readonly eventSourceRepo: Repository<EventSource>,
    @InjectRepository(ReturnRecord)
    private readonly returnRecordRepo: Repository<ReturnRecord>,
    @InjectRepository(CoordinationRecord)
    private readonly coordinationRepo: Repository<CoordinationRecord>,
  ) {}

  private async createLog(
    eventId: string,
    fromStatus: EventStatus | null,
    toStatus: EventStatus | null,
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
    event.sources = await this.eventSourceRepo.find({
      where: { eventId: id },
      relations: ['evaluation'],
      order: { createdAt: 'ASC' },
    });
    event.returnRecords = await this.returnRecordRepo.find({
      where: { eventId: id },
      order: { createdAt: 'ASC' },
    });
    event.coordinationRecords = await this.coordinationRepo.find({
      where: { eventId: id },
      order: { createdAt: 'ASC' },
    });
    return event;
  }

  async create(dto: CreateEventDto): Promise<Event> {
    const autoMerge = dto.autoMerge !== false;

    if (autoMerge) {
      const { isDuplicate, duplicateEvents } = await this.checkDuplicate(
        dto.eventType,
        dto.address,
      );
      if (isDuplicate && duplicateEvents.length > 0) {
        const targetEvent = duplicateEvents[0];
        return this.appendSourceToEvent(targetEvent, dto, MergeStrategy.AUTO);
      }
    }

    const event = this.eventRepo.create({
      ...dto,
      status: EventStatus.PENDING,
      coordinationStatus: CoordinationStatus.NONE,
      returnCount: 0,
    });
    const saved = await this.eventRepo.save(event);

    const source = this.eventSourceRepo.create({
      eventId: saved.id,
      originalEventId: saved.id,
      mergeStrategy: MergeStrategy.AUTO,
      reporterId: dto.reporterId || null,
      reporterName: dto.reporterName || null,
      reporterPhone: dto.reporterPhone || null,
      description: dto.description,
      photos: dto.photos || null,
      callbackStatus: SourceCallbackStatus.PENDING,
    });
    await this.eventSourceRepo.save(source);

    await this.createLog(saved.id, null, EventStatus.PENDING, '事件创建（含初始来源）');
    return this.findOne(saved.id);
  }

  private async appendSourceToEvent(
    targetEvent: Event,
    dto: CreateEventDto,
    strategy: MergeStrategy,
    operatorId?: string,
    operatorName?: string,
  ): Promise<Event> {
    const source = this.eventSourceRepo.create({
      eventId: targetEvent.id,
      originalEventId: null,
      mergeStrategy: strategy,
      reporterId: dto.reporterId || null,
      reporterName: dto.reporterName || null,
      reporterPhone: dto.reporterPhone || null,
      description: dto.description,
      photos: dto.photos || null,
      callbackStatus: SourceCallbackStatus.PENDING,
      mergedByOperatorId: operatorId || null,
      mergedByOperatorName: operatorName || null,
    });
    await this.eventSourceRepo.save(source);

    const strategyText = strategy === MergeStrategy.AUTO ? '自动合并' : '手动合并';
    await this.createLog(
      targetEvent.id,
      targetEvent.status as EventStatus,
      targetEvent.status as EventStatus,
      `${strategyText}新增来源：${dto.reporterName || '匿名居民'}（${dto.reporterPhone || '无电话'}）`,
      operatorId,
      operatorName,
    );

    return this.findOne(targetEvent.id);
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

    const operator = dto.operatorId
      ? await this.userRepo.findOne({ where: { id: dto.operatorId } })
      : null;

    const fromDepartmentId = event.assignedDepartmentId;
    const fromDepartment = fromDepartmentId
      ? await this.departmentRepo.findOne({ where: { id: fromDepartmentId } })
      : null;

    const fromStatus = event.status as EventStatus;
    event.returnCount = (event.returnCount || 0) + 1;

    const returnRecord = this.returnRecordRepo.create({
      eventId: event.id,
      fromDepartmentId: fromDepartmentId || null,
      fromDepartmentName: fromDepartment?.name || null,
      toDepartmentId: null,
      toDepartmentName: null,
      returnReason: dto.returnReason,
      returnRemark: dto.returnRemark,
      operatorId: dto.operatorId || null,
      operatorName: operator?.name || null,
      returnRound: event.returnCount,
    });
    await this.returnRecordRepo.save(returnRecord);

    const needsCoordination =
      event.returnCount >= 2 ||
      dto.returnReason === ReturnReason.NOT_OUR_RESPONSIBILITY;

    if (needsCoordination) {
      event.status = EventStatus.IN_COORDINATION;
      event.coordinationStatus = CoordinationStatus.PENDING_COORDINATION;
      event.returnReason = dto.returnReason;
      event.returnRemark = dto.returnRemark;

      const coordination = this.coordinationRepo.create({
        eventId: event.id,
        status: CoordinationStatus.PENDING_COORDINATION,
        coordinationRemark: `第 ${event.returnCount} 次退回触发协调，退回原因：${dto.returnReason}${dto.returnRemark ? `，备注：${dto.returnRemark}` : ''}`,
        operatorId: dto.operatorId || null,
        operatorName: operator?.name || null,
      });
      await this.coordinationRepo.save(coordination);

      const saved = await this.eventRepo.save(event);
      await this.createLog(
        saved.id,
        fromStatus,
        EventStatus.IN_COORDINATION,
        `第 ${event.returnCount} 次退回，进入协调。退回部门: ${fromDepartment?.name || '未知'}, 原因: ${dto.returnReason}, 备注: ${dto.returnRemark}`,
        dto.operatorId,
        operator?.name,
      );
      return this.findOne(saved.id);
    }

    event.status = EventStatus.RETURNED;
    event.returnReason = dto.returnReason;
    event.returnRemark = dto.returnRemark;

    const saved = await this.eventRepo.save(event);
    await this.createLog(
      saved.id,
      fromStatus,
      EventStatus.RETURNED,
      `第 ${event.returnCount} 次退回。退回部门: ${fromDepartment?.name || '未知'}, 原因: ${dto.returnReason}, 备注: ${dto.returnRemark}`,
      dto.operatorId,
      operator?.name,
    );
    return this.findOne(saved.id);
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

  async mergeEvents(dto: MergeEventsDto): Promise<Event> {
    if (dto.sourceEventIds.includes(dto.targetEventId)) {
      throw new BadRequestException('目标事件不能在源事件列表中');
    }

    const targetEvent = await this.findOne(dto.targetEventId);
    if (!targetEvent) {
      throw new NotFoundException(`目标事件 ${dto.targetEventId} 不存在`);
    }

    const sourceEvents = await this.eventRepo.find({
      where: { id: In(dto.sourceEventIds) },
    });
    if (sourceEvents.length !== dto.sourceEventIds.length) {
      const foundIds = sourceEvents.map((e) => e.id);
      const missingIds = dto.sourceEventIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`源事件不存在: ${missingIds.join(', ')}`);
    }
    for (const se of sourceEvents) {
      se.sources = await this.eventSourceRepo.find({
        where: { eventId: se.id },
        relations: ['evaluation'],
      });
    }

    const strategy = dto.mergeStrategy || MergeStrategy.MANUAL;
    targetEvent.mergeStrategy = strategy;

    for (const sourceEvent of sourceEvents) {
      if (sourceEvent.sources && sourceEvent.sources.length > 0) {
        for (const src of sourceEvent.sources) {
          const newSource = this.eventSourceRepo.create({
            eventId: targetEvent.id,
            originalEventId: sourceEvent.id,
            mergeStrategy: strategy,
            reporterId: src.reporterId,
            reporterName: src.reporterName,
            reporterPhone: src.reporterPhone,
            description: src.description,
            photos: src.photos,
            callbackStatus: src.callbackStatus || SourceCallbackStatus.PENDING,
            callbackRemark: src.callbackRemark,
            callbackAt: src.callbackAt,
            mergedByOperatorId: dto.operatorId || null,
            mergedByOperatorName: dto.operatorName || null,
          });
          if (src.evaluation) {
            newSource.evaluation = src.evaluation;
          }
          await this.eventSourceRepo.save(newSource);
        }
      } else {
        const newSource = this.eventSourceRepo.create({
          eventId: targetEvent.id,
          originalEventId: sourceEvent.id,
          mergeStrategy: strategy,
          reporterId: sourceEvent.reporterId,
          reporterName: sourceEvent.reporterName,
          reporterPhone: sourceEvent.reporterPhone,
          description: sourceEvent.description,
          photos: sourceEvent.photos,
          callbackStatus: SourceCallbackStatus.PENDING,
          mergedByOperatorId: dto.operatorId || null,
          mergedByOperatorName: dto.operatorName || null,
        });
        await this.eventSourceRepo.save(newSource);
      }

      const fromStatus = sourceEvent.status as EventStatus;
      sourceEvent.status = EventStatus.MERGED;
      sourceEvent.duplicateOfEventId = targetEvent.id;
      await this.eventRepo.save(sourceEvent);
      await this.createLog(
        sourceEvent.id,
        fromStatus,
        EventStatus.MERGED,
        `合并至事件 ${targetEvent.id}${dto.remark ? `: ${dto.remark}` : ''}`,
        dto.operatorId,
        dto.operatorName,
      );
    }

    await this.createLog(
      targetEvent.id,
      targetEvent.status as EventStatus,
      targetEvent.status as EventStatus,
      `手动合并来源事件: ${dto.sourceEventIds.join(', ')}${dto.remark ? `, 备注: ${dto.remark}` : ''}`,
      dto.operatorId,
      dto.operatorName,
    );

    return this.findOne(targetEvent.id);
  }

  async coordinateAssign(id: string, dto: CoordinateAssignDto): Promise<Event> {
    const event = await this.findOne(id);

    if (![EventStatus.IN_COORDINATION, EventStatus.RETURNED, EventStatus.RESPONSIBILITY_UNCLEAR].includes(event.status as EventStatus)) {
      throw new BadRequestException(`当前状态 ${event.status} 不允许协调派单`);
    }

    const leadDept = await this.departmentRepo.findOne({ where: { id: dto.leadDepartmentId } });
    if (!leadDept) {
      throw new NotFoundException(`牵头部门 ${dto.leadDepartmentId} 不存在`);
    }

    let collaborativeDeptNames: string[] = [];
    if (dto.collaborativeDepartmentIds && dto.collaborativeDepartmentIds.length > 0) {
      const collabDepts = await this.departmentRepo.find({
        where: { id: In(dto.collaborativeDepartmentIds) },
      });
      collaborativeDeptNames = collabDepts.map((d) => d.name);
    }

    const operator = dto.operatorId
      ? await this.userRepo.findOne({ where: { id: dto.operatorId } })
      : null;

    const fromStatus = event.status as EventStatus;
    event.status = EventStatus.ASSIGNED;
    event.coordinationStatus = CoordinationStatus.COORDINATED;
    event.leadDepartmentId = leadDept.id;
    event.leadDepartmentName = leadDept.name;
    event.assignedDepartmentId = leadDept.id;
    event.coordinationCollaborativeIds = dto.collaborativeDepartmentIds || null;
    event.coordinationCollaborativeNames = collaborativeDeptNames.length > 0 ? collaborativeDeptNames : null;
    event.collaborativeDepartmentIds = dto.collaborativeDepartmentIds || null;
    event.coordinationRemark = dto.coordinationRemark || null;
    const deadlineHours = URGENCY_DEADLINE_HOURS[event.urgency];
    event.deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

    const saved = await this.eventRepo.save(event);

    const coordinationRecord = this.coordinationRepo.create({
      eventId: saved.id,
      status: CoordinationStatus.COORDINATED,
      leadDepartmentId: leadDept.id,
      leadDepartmentName: leadDept.name,
      collaborativeDepartmentIds: dto.collaborativeDepartmentIds || null,
      collaborativeDepartmentNames: collaborativeDeptNames.length > 0 ? collaborativeDeptNames : null,
      coordinationRemark: dto.coordinationRemark || null,
      operatorId: dto.operatorId || null,
      operatorName: operator?.name || null,
      coordinatedAt: new Date(),
    });
    await this.coordinationRepo.save(coordinationRecord);

    const collabText = collaborativeDeptNames.length > 0 ? `，协同部门: ${collaborativeDeptNames.join('、')}` : '';
    await this.createLog(
      saved.id,
      fromStatus,
      EventStatus.ASSIGNED,
      `指挥中心协调派单 - 牵头部门: ${leadDept.name}${collabText}${dto.coordinationRemark ? `，协调备注: ${dto.coordinationRemark}` : ''}`,
      dto.operatorId,
      operator?.name,
    );

    return this.findOne(saved.id);
  }

  async findEventSources(eventId: string): Promise<EventSource[]> {
    await this.findOne(eventId);
    return this.eventSourceRepo.find({
      where: { eventId },
      relations: ['evaluation'],
      order: { createdAt: 'ASC' },
    });
  }

  async findOneSource(sourceId: string): Promise<EventSource> {
    const source = await this.eventSourceRepo.findOne({
      where: { id: sourceId },
      relations: ['evaluation'],
    });
    if (!source) {
      throw new NotFoundException(`事件来源 ${sourceId} 不存在`);
    }
    return source;
  }

  async updateSourceCallback(sourceId: string, dto: UpdateSourceCallbackDto): Promise<EventSource> {
    const source = await this.findOneSource(sourceId);
    source.callbackStatus = dto.callbackStatus;
    source.callbackRemark = dto.callbackRemark || null;
    if (
      dto.callbackStatus === SourceCallbackStatus.CALLBACK_COMPLETED ||
      dto.callbackStatus === SourceCallbackStatus.CALLBACK_FAILED ||
      dto.callbackStatus === SourceCallbackStatus.EVALUATED
    ) {
      source.callbackAt = new Date();
    }
    return this.eventSourceRepo.save(source);
  }

  async evaluateSource(dto: EvaluateSourceDto): Promise<EventSource> {
    const source = await this.findOneSource(dto.sourceId);

    const evaluation = this.evaluationRepo.create({
      eventId: source.eventId,
      satisfaction: dto.satisfaction,
      isApproved: dto.isApproved,
      comment: dto.comment || null,
      evaluatorId: dto.evaluatorId || null,
      evaluatorName: dto.evaluatorName || null,
    });
    const savedEval = await this.evaluationRepo.save(evaluation);

    source.evaluation = savedEval;
    source.callbackStatus = SourceCallbackStatus.EVALUATED;
    source.callbackAt = new Date();

    const savedSource = await this.eventSourceRepo.save(source);

    await this.createLog(
      source.eventId,
      null,
      null as any,
      `来源回访评价 - 报事人: ${source.reporterName || '匿名'}, 满意度: ${dto.satisfaction}, 认可: ${dto.isApproved}`,
      dto.evaluatorId,
      dto.evaluatorName,
    );

    return savedSource;
  }

  async findReturnRecords(eventId: string): Promise<ReturnRecord[]> {
    await this.findOne(eventId);
    return this.returnRecordRepo.find({
      where: { eventId },
      order: { createdAt: 'ASC' },
    });
  }

  async findCoordinationRecords(eventId: string): Promise<CoordinationRecord[]> {
    await this.findOne(eventId);
    return this.coordinationRepo.find({
      where: { eventId },
      order: { createdAt: 'ASC' },
    });
  }
}

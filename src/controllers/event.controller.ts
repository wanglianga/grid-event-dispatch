import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EventService } from '../services/event.service';
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
import { Event } from '../entities/event.entity';
import { EventType } from '../common/enums';

@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEventDto): Promise<Event> {
    return this.eventService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryEventDto): Promise<{ data: Event[]; total: number; page: number; pageSize: number }> {
    return this.eventService.findAll(query);
  }

  @Get('check/duplicate')
  checkDuplicate(
    @Query('eventType') eventType: EventType,
    @Query('address') address: string,
  ): Promise<{ isDuplicate: boolean; duplicateEvents: Event[] }> {
    return this.eventService.checkDuplicate(eventType, address);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Event> {
    return this.eventService.findOne(id);
  }

  @Put(':id/verify')
  verify(
    @Param('id') id: string,
    @Body() dto: VerifyEventDto,
  ): Promise<Event> {
    return this.eventService.verify(id, dto);
  }

  @Put(':id/auto-assign')
  autoAssign(
    @Param('id') id: string,
    @Body() dto: AutoAssignEventDto,
  ): Promise<Event> {
    return this.eventService.autoAssign(id, dto);
  }

  @Put(':id/assign')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignEventDto,
  ): Promise<Event> {
    return this.eventService.assign(id, dto);
  }

  @Put(':id/process')
  process(
    @Param('id') id: string,
    @Body() dto: ProcessEventDto,
  ): Promise<Event> {
    return this.eventService.process(id, dto);
  }

  @Put(':id/return')
  returnEvent(
    @Param('id') id: string,
    @Body() dto: ReturnEventDto,
  ): Promise<Event> {
    return this.eventService.returnEvent(id, dto);
  }

  @Put(':id/complete')
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteEventDto,
  ): Promise<Event> {
    return this.eventService.complete(id, dto);
  }

  @Post(':id/evaluate')
  @HttpCode(HttpStatus.CREATED)
  evaluate(
    @Param('id') id: string,
    @Body() dto: EvaluateEventDto,
  ): Promise<Event> {
    return this.eventService.evaluate(id, dto);
  }

  @Put(':id/reject')
  rejectCompletion(
    @Param('id') id: string,
    @Body() dto: RejectCompletionDto,
  ): Promise<Event> {
    return this.eventService.rejectCompletion(id, dto);
  }

  @Put(':id/escalate')
  escalate(
    @Param('id') id: string,
    @Body() dto: EscalateEventDto,
  ): Promise<Event> {
    return this.eventService.escalate(id, dto);
  }

  @Put(':id/duplicate')
  markDuplicate(
    @Param('id') id: string,
    @Body() dto: MarkDuplicateDto,
  ): Promise<Event> {
    return this.eventService.markDuplicate(id, dto);
  }
}

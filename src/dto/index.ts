import {
  IsEnum,
  IsString,
  MaxLength,
  IsOptional,
  IsArray,
  IsNumber,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import {
  EventType,
  UrgencyLevel,
  ReturnReason,
  SourceCallbackStatus,
  MergeStrategy,
} from '../common/enums';

export class CreateEventDto {
  @IsEnum(EventType)
  eventType: EventType;

  @IsString()
  @MaxLength(500)
  description: string;

  @IsString()
  @MaxLength(200)
  address: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photos?: string[];

  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgency?: UrgencyLevel;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  reporterName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  reporterPhone?: string;

  @IsOptional()
  @IsUUID()
  reporterId?: string;

  @IsOptional()
  @IsBoolean()
  autoMerge?: boolean;
}

export class MergeEventsDto {
  @IsUUID()
  targetEventId: string;

  @IsArray()
  @IsUUID(undefined, { each: true })
  sourceEventIds: string[];

  @IsOptional()
  @IsEnum(MergeStrategy)
  mergeStrategy?: MergeStrategy;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  operatorName?: string;
}

export class CoordinateAssignDto {
  @IsUUID()
  leadDepartmentId: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  collaborativeDepartmentIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  coordinationRemark?: string;

  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  operatorName?: string;
}

export class UpdateSourceCallbackDto {
  @IsEnum(SourceCallbackStatus)
  callbackStatus: SourceCallbackStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  callbackRemark?: string;

  @IsOptional()
  @IsUUID()
  operatorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  operatorName?: string;
}

export class EvaluateSourceDto {
  @IsUUID()
  sourceId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  satisfaction: number;

  @IsBoolean()
  isApproved: boolean;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsUUID()
  evaluatorId?: string;

  @IsOptional()
  @IsString()
  evaluatorName?: string;
}

export class VerifyEventDto {
  @IsUUID()
  gridWorkerId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  verifyRemark?: string;

  @IsOptional()
  @IsBoolean()
  isAddressClear?: boolean;

  @IsOptional()
  @IsString()
  addressRemark?: string;
}

export class AssignEventDto {
  @IsUUID()
  assignedDepartmentId: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  collaborativeDepartmentIds?: string[];

  @IsOptional()
  @IsString()
  remark?: string;
}

export class AutoAssignEventDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class ProcessEventDto {
  @IsUUID()
  operatorId: string;

  @IsOptional()
  @IsString()
  processResult?: string;
}

export class ReturnEventDto {
  @IsUUID()
  operatorId: string;

  @IsEnum(ReturnReason)
  returnReason: ReturnReason;

  @IsString()
  @MaxLength(500)
  returnRemark: string;
}

export class CompleteEventDto {
  @IsUUID()
  operatorId: string;

  @IsString()
  processResult: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completionMaterials?: string[];
}

export class EvaluateEventDto {
  @IsInt()
  @Min(1)
  @Max(5)
  satisfaction: number;

  @IsBoolean()
  isApproved: boolean;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsUUID()
  evaluatorId?: string;

  @IsOptional()
  @IsString()
  evaluatorName?: string;

  @IsOptional()
  @IsString()
  rejectRemark?: string;
}

export class RejectCompletionDto {
  @IsString()
  @MaxLength(500)
  rejectRemark: string;
}

export class MarkDuplicateDto {
  @IsUUID()
  duplicateOfEventId: string;
}

export class EscalateEventDto {
  @IsOptional()
  @IsString()
  remark?: string;
}

export class QueryEventDto {
  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  status?: string;

  @IsOptional()
  @IsUUID()
  assignedDepartmentId?: string;

  @IsOptional()
  @IsUUID()
  gridWorkerId?: string;

  @IsOptional()
  @IsEnum(UrgencyLevel)
  urgency?: UrgencyLevel;

  @IsOptional()
  @IsInt()
  page?: number;

  @IsOptional()
  @IsInt()
  pageSize?: number;
}

export class CreateUserDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  username: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  role?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  gridCode?: string;
}

export class CreateDepartmentDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  type?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  type?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  role?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  gridCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

import {
  EventStatus,
  EventType,
  UrgencyLevel,
  UserRole,
  DepartmentType,
  ReturnReason,
  SourceCallbackStatus,
  CoordinationStatus,
  MergeStrategy,
} from './enums';

export const EventStatusLabel: Record<EventStatus, string> = {
  [EventStatus.PENDING]: '待核实',
  [EventStatus.VERIFIED]: '已核实待派单',
  [EventStatus.ADDRESS_UNCLEAR]: '地址不清',
  [EventStatus.RESPONSIBILITY_UNCLEAR]: '权责不明',
  [EventStatus.ASSIGNED]: '已派单',
  [EventStatus.PROCESSING]: '处理中',
  [EventStatus.RETURNED]: '已退回',
  [EventStatus.IN_COORDINATION]: '协调中',
  [EventStatus.ESCALATED]: '已升级督办',
  [EventStatus.COMPLETED]: '待确认办结',
  [EventStatus.CONFIRMED]: '已办结',
  [EventStatus.REJECTED]: '居民不认可',
  [EventStatus.CLOSED]: '已关闭',
  [EventStatus.DUPLICATE]: '重复事件',
  [EventStatus.MERGED]: '已合并',
};

export const SourceCallbackStatusLabel: Record<SourceCallbackStatus, string> = {
  [SourceCallbackStatus.PENDING]: '待回访',
  [SourceCallbackStatus.CALLBACK_SCHEDULED]: '回访已排期',
  [SourceCallbackStatus.CALLBACK_IN_PROGRESS]: '回访中',
  [SourceCallbackStatus.CALLBACK_COMPLETED]: '回访完成',
  [SourceCallbackStatus.CALLBACK_FAILED]: '回访失败',
  [SourceCallbackStatus.EVALUATED]: '已评价',
};

export const CoordinationStatusLabel: Record<CoordinationStatus, string> = {
  [CoordinationStatus.NONE]: '无需协调',
  [CoordinationStatus.PENDING_COORDINATION]: '待协调',
  [CoordinationStatus.COORDINATING]: '协调中',
  [CoordinationStatus.COORDINATED]: '已协调',
};

export const MergeStrategyLabel: Record<MergeStrategy, string> = {
  [MergeStrategy.AUTO]: '自动合并',
  [MergeStrategy.MANUAL]: '手动合并',
};

export const EventTypeLabel: Record<EventType, string> = {
  [EventType.ROAD_OCCUPATION]: '占道经营',
  [EventType.MANHOLE_DAMAGE]: '井盖破损',
  [EventType.NOISE_DISTURBANCE]: '噪声扰民',
  [EventType.WATERLOGGING]: '积水隐患',
  [EventType.GARBAGE]: '垃圾堆放',
  [EventType.FACILITY_DAMAGE]: '设施损坏',
  [EventType.OTHER]: '其他',
};

export const UrgencyLevelLabel: Record<UrgencyLevel, string> = {
  [UrgencyLevel.LOW]: '一般',
  [UrgencyLevel.MEDIUM]: '较重',
  [UrgencyLevel.HIGH]: '严重',
  [UrgencyLevel.URGENT]: '紧急',
};

export const UserRoleLabel: Record<UserRole, string> = {
  [UserRole.RESIDENT]: '居民',
  [UserRole.GRID_WORKER]: '网格员',
  [UserRole.COMMAND_CENTER]: '指挥中心',
  [UserRole.DEPARTMENT_STAFF]: '部门工作人员',
  [UserRole.ADMIN]: '管理员',
};

export const DepartmentTypeLabel: Record<DepartmentType, string> = {
  [DepartmentType.CHENGGUAN]: '城管',
  [DepartmentType.MUNICIPAL]: '市政',
  [DepartmentType.PROPERTY]: '物业',
  [DepartmentType.TRAFFIC_POLICE]: '交警',
  [DepartmentType.ENVIRONMENTAL]: '环保',
  [DepartmentType.OTHER]: '其他部门',
};

export const ReturnReasonLabel: Record<ReturnReason, string> = {
  [ReturnReason.ADDRESS_UNCLEAR]: '地址不清',
  [ReturnReason.NOT_OUR_RESPONSIBILITY]: '非本部门职责',
  [ReturnReason.INSUFFICIENT_INFO]: '信息不足',
  [ReturnReason.DUPLICATE_EVENT]: '重复事件',
  [ReturnReason.OTHER]: '其他原因',
};

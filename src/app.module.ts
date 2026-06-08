import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { getDbConfig } from './config/database';
import { Department } from './entities/department.entity';
import { User } from './entities/user.entity';
import { Event } from './entities/event.entity';
import { EventLog } from './entities/event-log.entity';
import { Evaluation } from './entities/evaluation.entity';
import { SeedService } from './services/seed.service';
import { DepartmentService } from './services/department.service';
import { UserService } from './services/user.service';
import { EventService } from './services/event.service';
import { DepartmentController } from './controllers/department.controller';
import { UserController } from './controllers/user.controller';
import { EventController } from './controllers/event.controller';
import { HealthController } from './controllers/health.controller';
import { OverdueScheduler } from './scheduler/overdue.scheduler';

@Module({
  imports: [
    TypeOrmModule.forRoot(getDbConfig()),
    TypeOrmModule.forFeature([Department, User, Event, EventLog, Evaluation]),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    HealthController,
    DepartmentController,
    UserController,
    EventController,
  ],
  providers: [
    SeedService,
    DepartmentService,
    UserService,
    EventService,
    OverdueScheduler,
  ],
})
export class AppModule {}

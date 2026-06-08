import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventService } from '../services/event.service';

@Injectable()
export class OverdueScheduler {
  private readonly logger = new Logger(OverdueScheduler.name);

  constructor(private readonly eventService: EventService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleOverdueEvents() {
    this.logger.log('Running scheduled overdue event check...');
    try {
      await this.eventService.checkAndEscalateOverdue();
      this.logger.log('Overdue event check completed successfully');
    } catch (error) {
      this.logger.error('Overdue event check failed', error);
    }
  }
}

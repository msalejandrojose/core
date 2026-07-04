import { Injectable } from '@nestjs/common';
import { CronExpressionParser } from 'cron-parser';
import { CronClockPort } from '../../application/ports/cron-clock.port';

// Adaptador de `CronClockPort` sobre cron-parser. Las expresiones se
// interpretan en UTC (spec §4: cron de 5 campos UTC).
@Injectable()
export class CronParserClock implements CronClockPort {
  next(expression: string, from: Date): Date {
    const interval = CronExpressionParser.parse(expression, {
      currentDate: from,
      tz: 'UTC',
    });
    return interval.next().toDate();
  }

  isValid(expression: string): boolean {
    try {
      CronExpressionParser.parse(expression, { tz: 'UTC' });
      return true;
    } catch {
      return false;
    }
  }
}

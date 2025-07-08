import { Controller, Get, UseGuards } from '@nestjs/common';
import { StaticsService } from './statics.servics';
import { JwtAuthGuard } from 'src/shared/jwt-auth-guard';
import { UserRoleGuard } from 'src/middleware/userRole.guard';
import { Roles } from 'src/decorators/role.decorator';

@Controller('statics')
export class StaticsController {
  constructor(private readonly staticsService: StaticsService) {}

  @Get('last-month')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async getLastMonthStatics() {
    return this.staticsService.getLastMonthStatics();
  }

  @Get('last-week')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async getLastWeekStatics() {
    return this.staticsService.getLastWeekStatics();
  }

  @Get('last-day')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async getLastDayStatics() {
    return this.staticsService.getLastDayStatics();
  }

  @Get('total-length')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async getTotalLength() {
    return this.staticsService.getTotalLength();
  }
}

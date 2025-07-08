import {
  Controller,
  Get,
  Post,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { ReportService } from './reports.service';
import { JwtAuthGuard } from 'src/shared/jwt-auth-guard';
import { User } from 'src/auth/types/User';
import { Request } from 'express';
import { UserRoleGuard } from 'src/middleware/userRole.guard';
import { Roles } from 'src/decorators/role.decorator';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Post('create/:id')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('user')
  async createReport(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User;
    return this.reportService.createReport(id, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async getReports(@Query('page') page: number, @Query('size') size: number) {
    // If page or size is not provided, default to page 1 and size 10
    page = page ? +page : 1;
    size = size ? +size : 10;

    return this.reportService.getReports(page, size);
  }
  @Delete(':reportId')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async deleteReport(@Param('reportId') reportId: string) {
    await this.reportService.deleteReport(reportId);
    return {
      message: 'deleted',
    };
  }

  @Delete('admin/remove/:id')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async deleteReportAndAssociatedData(@Param('id') reportId: string) {
    try {
      return await this.reportService.rmoveWithAssociatedVotesAndUplaods(
        reportId,
      );
    } catch (error) {
      throw new Error('Failed to delete report and associated data');
    }
  }
}

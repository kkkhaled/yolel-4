import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  Put,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SharedUploadsService } from './shared-upload.service';
import { Roles } from 'src/decorators/role.decorator';
import { JwtAuthGuard } from 'src/shared/jwt-auth-guard';
import { UserRoleGuard } from 'src/middleware/userRole.guard';
import { User } from 'src/auth/types/User';

@Controller('shared-uploads')
export class SharedUploadsController {
  constructor(private readonly sharedUploadsService: SharedUploadsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async getAllSharedUploads(
    @Query('page') page: number = 1,
    @Query('size') size: number = 10,
  ) {
    return this.sharedUploadsService.getAllSharedUploads(page, size);
  }

  @Post()
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('user')
  async createAndUpdateSharedUpload(
    @Body('uploadId') uploadId: string,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.sharedUploadsService.createAndUpdateSharedUpload(
      uploadId,
      user.id,
    );
  }

  // @Put(':id')
  // @UseGuards(JwtAuthGuard)
  // async updateSharedUpload(@Param('id') uploadId: string) {
  //   return this.sharedUploadsService.updateSharedUpload(uploadId);
  // }
}

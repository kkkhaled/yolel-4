import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  Req,
  Put,
  Delete,
  Query,
  UploadedFiles,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateUploadDto } from './dto/create-upload.dto';
import { JwtAuthGuard } from 'src/shared/jwt-auth-guard';
import { User } from 'src/auth/types/User';
import { Request } from 'express';
import { UserRoleGuard } from 'src/middleware/userRole.guard';
import { Roles } from 'src/decorators/role.decorator';

@Controller('posts')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.uploadService.findById(id);
  }
  @Get('all/me')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('user')
  async findByUser(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    const user = req.user as User;
    try {
      const result = await this.uploadService.findByUser(
        user.id,
        page,
        pageSize,
      );
      // calculate total pages numbers
      const totalPages = Math.ceil(result.totalItems / pageSize);
      return {
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        items: result.items,
        totalPages: totalPages,
      };
    } catch (error) {
      throw new Error('Error fetching uploads');
    }
  }

  @Get('list/admin')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin','sub_admin')
  async findAll(
    @Req() req: Request,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    try {
      const result = await this.uploadService.findAllForAdmin(page, pageSize);
      // calculate total pages numbers
      const totalPages = Math.ceil(result.totalItems / pageSize);
      return {
        page: result.page,
        pageSize: result.pageSize,
        totalItems: result.totalItems,
        items: result.items,
        totalPages: totalPages,
      };
    } catch (error) {
      throw new Error('Error fetching uploads');
    }
  }

  @Post('create')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('user')
  async create(
    @Req() req: Request,
    @UploadedFiles() file: { image?: any },
    @Body('gender') gender,
    @Body('imagePath') imagePath,
    @Body('ageType') ageType,
  ) {
    const user = req.user as User;
    // Create an instance of CreateUploadDto
    const createUploadDto: CreateUploadDto = {
      imageUrl: `${process.env.STORAGE_files}/${file.image[0].filename}`,
      voteNum: 0,
      user: user.id,
      gender,
      ageType,
      imagePath,
      isAdminCreated: false,
    };
    return this.uploadService.create(createUploadDto);
  }

  @Get('removed/deletedCount')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async getDeletedCount() {
    return await this.uploadService.getDeletedImagesCount();
  }

  @Post('create/admin')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }]))
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async createByAdmin(
    @Req() req: Request,
    @UploadedFiles() file: { image?: any },
    @Body('gender') gender,
    @Body('imagePath') imagePath,
    @Body('ageType') ageType,
  ) {
    const user = req.user as User;
    // Create an instance of CreateUploadDto
    const createUploadDto: CreateUploadDto = {
      imageUrl: `${process.env.STORAGE_files}/${file.image[0].filename}`,
      voteNum: 0,
      user: user.id,
      gender,
      ageType,
      imagePath,
      isAdminCreated: true,
    };
    return this.uploadService.create(createUploadDto);
  }

  @Put('update/:uploadId')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('user')
  async updateUploadVoteStatus(@Param('uploadId') uploadId: string) {
    return this.uploadService.updateUploadVoteStatus(uploadId);
  }
  @Delete('remove/:id')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('user', 'admin','sub_admin')
  async removeUpload(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User;

    return await this.uploadService.remove(id, user.id);
  }

  @Get('upload/search')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async searchUploads(
    @Query('percentage') percentage: number,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const result = await this.uploadService.searchUploadsByPercentage(
      percentage,
      page,
      limit,
    );
    return {
      currentPage: page,
      totalPages: Math.ceil(result.total / limit),
      totalItems: result.total,
      data: result.uploads,
    };
  }
  @Get('images/deleted')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin', 'sub_admin')
  async getDeletedUploads(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return await this.uploadService.getDeletedUploads(page, pageSize);
  }
}

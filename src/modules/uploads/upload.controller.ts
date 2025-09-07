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
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CreateUploadDto } from './dto/create-upload.dto';
import { JwtAuthGuard } from 'src/shared/jwt-auth-guard';
import { User } from 'src/auth/types/User';
import { Request } from 'express';
import { UserRoleGuard } from 'src/middleware/userRole.guard';
import { Roles } from 'src/decorators/role.decorator';
import { GetUploadsByUserLevelsDto } from './dto/get-user-levels-uplaods.dto';
import * as fs from 'fs';
import { FileUploadValidationService } from './utils/upload-validation-service';

@Controller('posts')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly fileValidationService: FileUploadValidationService,
  ) {}

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
  @Roles('admin', 'sub_admin')
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
    @Body('gender') gender: string,
    @Body('imagePath') imagePath: string,
    @Body('ageType') ageType: string,
  ) {
    const user = req.user as User;

    if (!file?.image?.[0]) {
      throw new HttpException('Image is required', HttpStatus.BAD_REQUEST);
    }

    const uploadedFile = file.image[0];
    const imageUrl = `${process.env.STORAGE_files}/${uploadedFile.filename}`;

    try {
      // التحقق من صحة الصورة
      const fileBuffer = fs.readFileSync(uploadedFile.path);
      const validationResult =
        await this.fileValidationService.validatePhoto(fileBuffer);

      // ✅ الصورة صحيحة - حفظ في uploads
      const createUploadDto: CreateUploadDto = {
        imageUrl,
        voteNum: 0,
        user: user.id,
        gender,
        ageType,
        imagePath,
        isAdminCreated: false,
      };

      const result = await this.uploadService.create(createUploadDto);
      return {
        message: 'Image uploaded successfully ✅',
      };
    } catch (error) {
      let refusalReason = 'Photo validation failed';

      if (error instanceof HttpException) {
        const response = error.getResponse() as any;
        refusalReason = response.reason || refusalReason;
      }

      await this.uploadService.createRefusedImage({
        imageUrl,
        reason: refusalReason,
        gender,
        ageType,
      });

      return {
        message: 'refused image created with flag isRefused true',
        reason: refusalReason,
      };
    }
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
  @Roles('user', 'admin', 'sub_admin')
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

  @Get('images/refused')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin', 'sub_admin')
  async getRefusedUploads(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return await this.uploadService.getRefusedImages(page, pageSize);
  }

  @Get('user/levels')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('user')
  async getByUserLevels(@Query() query: GetUploadsByUserLevelsDto, @Req() req) {
    return this.uploadService.getUploadsByUserLevels(
      {
        page: query.page,
        limit: query.limit,
        includeSelf: query.includeSelf,
        sort: query.sort,
        order: query.order,
      },
      req.user.id,
    );
  }

  @Post('migrate')
  async migrate() {
    return await this.uploadService.migrateUploadLevels();
  }
}

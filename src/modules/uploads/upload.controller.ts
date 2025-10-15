import {
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
  Body,
  Req,
  Put,
  Delete,
  Query,
  UploadedFiles,
  HttpException,
  HttpStatus,
  BadRequestException,
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
      const start = process.hrtime();

      // const validationResult =
      //   await this.fileValidationService.validatePhoto(fileBuffer);

      // ⏱️ stop timer
      const diff = process.hrtime(start);
      const validationMs = (diff[0] * 1000 + diff[1] / 1e6).toFixed(2);
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
        userPoints: result?.userPoints,
      };
    } catch (error) {
      let refusalReason = 'Photo validation failed';

      if (error instanceof HttpException) {
        const response = error.getResponse() as any;
        refusalReason = response.reason || refusalReason;
      }

      await this.uploadService.createRefusedImage({
        imageUrl,
        refusalReason: refusalReason,
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
        uploadId: query?.uploadId,
      },
      req.user.id,
    );
  }

  @Get('filter/search-by-percentage-range')
  @UseGuards(JwtAuthGuard)
  async searchUploadsByPercentageRange(
    @Query('fromPercentage') fromPercentage?: string,
    @Query('toPercentage') toPercentage?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const from = Number(fromPercentage);
    const to = Number(toPercentage);
    const pageNum = Number.parseInt(page, 10);
    const limitNum = Number.parseInt(limit, 10);

    // Basic validation
    if (!Number.isFinite(from) || !Number.isFinite(to)) {
      throw new BadRequestException(
        'fromPercentage and toPercentage are required numbers',
      );
    }
    if (from < 0 || from > 100) {
      throw new BadRequestException('fromPercentage must be between 0 and 100');
    }
    if (to < 0 || to > 100) {
      throw new BadRequestException('toPercentage must be between 0 and 100');
    }
    if (from > to) {
      throw new BadRequestException(
        'fromPercentage cannot be greater than toPercentage',
      );
    }
    if (!Number.isFinite(pageNum) || pageNum < 1) {
      throw new BadRequestException('page must be a positive integer');
    }
    if (!Number.isFinite(limitNum) || limitNum < 1 || limitNum > 1000) {
      throw new BadRequestException(
        'limit must be an integer between 1 and 1000',
      );
    }

    return this.uploadService.searchUploadsByPercentageRange(
      from,
      to,
      pageNum,
      limitNum,
    );
  }

  @Post('migrate')
  async migrate() {
    return await this.uploadService.migrateUploadLevels();
  }
}

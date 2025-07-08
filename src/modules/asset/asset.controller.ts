import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { AssetService } from './assest.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('asset')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get('logo')
  async getLogo() {
    return this.assetService.findByName('logo');
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('image'))
  async createLogo(@UploadedFile() image) {
    return this.assetService.create(image.path);
  }
}

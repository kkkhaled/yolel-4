import { Controller, Get, Post, Put } from '@nestjs/common';
import { PreviewService } from './preview.service';

@Controller('preview')
export class PreviewController {
  constructor(private readonly previewService: PreviewService) {}

  @Post()
  async createPreview() {
    return await this.previewService.createPreview();
  }

  @Get()
  async getPreview() {
    return this.previewService.getPreview();
  }

  @Put()
  async updatePreview() {
    return this.previewService.updatePreview();
  }
}

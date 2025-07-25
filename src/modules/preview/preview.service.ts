import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Preview } from 'src/schema/preview.schems';

@Injectable()
export class PreviewService {
  constructor(
    @InjectModel(Preview.name) private previewModel: Model<Preview>,
  ) {}

  // create preview
  async createPreview() {
    // make sure it have only one
    await this.previewModel.deleteMany({});
    return this.previewModel.create({ isPreview: true });
  }

  async getPreview() {
    return this.previewModel.findOne();
  }

  // update preview
  async updatePreview() {
    // get first and update
    let preview = await this.previewModel.findOne();
    preview.isPreview = !preview.isPreview;
    return await preview.save();
  }
}

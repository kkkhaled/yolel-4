import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset } from 'src/schema/assetSchema';

@Injectable()
export class AssetService {
  constructor(@InjectModel(Asset.name) private asset: Model<Asset>) {}

  async create(imageUrl: string) {
    let asset = await this.asset.countDocuments({
      name: 'logo',
    });
    if (asset > 0) {
      return new BadRequestException('Logo already exists');
    }
    const createdAsset = new this.asset({ name: 'logo', imageUrl });
    return createdAsset.save();
  }

  async findByName(name: string) {
    console.log(name);

    const logo = await this.asset.findOne({ name });
    if (!logo) {
      throw new NotFoundException(`${name} not found`);
    } else {
      return logo;
    }
  }
}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';

import { Asset, AssetSchema } from 'src/schema/assetSchema';
import { AssetController } from './asset.controller';
import { AssetService } from './assest.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Asset.name, schema: AssetSchema }]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            file.fieldname +
              '-' +
              uniqueSuffix +
              '.' +
              file.originalname.split('.').pop(),
          );
        },
      }),
    }),
  ],
  controllers: [AssetController],
  providers: [AssetService],
  exports: [],
})
export class AssetModule {}

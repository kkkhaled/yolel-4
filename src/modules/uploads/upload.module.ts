import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadSchema } from '../../schema/uploadSchema';

import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';
import { UserSchema } from 'src/schema/userSchema';
import { VoteSchema } from 'src/schema/voteSchema';
import {
  SharedUploads,
  SharedUploadsSchema,
} from 'src/schema/sharedUpload.schema';
import { Report, ReportSchema } from 'src/schema/reports';
import { DeletedUploadsSchema } from 'src/schema/deleted-upload';
import { DeletedImageSchema } from 'src/schema/deleted-images';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Upload', schema: UploadSchema },
      {
        name: 'Vote',
        schema: VoteSchema,
      },
      {
        name: 'User',
        schema: UserSchema,
      },
      { name: SharedUploads.name, schema: SharedUploadsSchema },
      { name: Report.name, schema: ReportSchema },
      { name: 'DeletedUploads', schema: DeletedUploadsSchema },
      { name: 'DeletedImage', schema: DeletedImageSchema },
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: process.env.STORAGE_files,
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(
            Math.random() * 1e9,
          )}.${file.originalname.split('.').pop()}`;
          cb(null, `${file.fieldname}-${uniqueSuffix}`);
        },
      }),
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [],
})
export class UploadModule {}

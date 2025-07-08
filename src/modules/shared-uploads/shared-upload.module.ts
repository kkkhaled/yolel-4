import { Module } from '@nestjs/common';
import { SharedUploadsService } from './shared-upload.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  SharedUploads,
  SharedUploadsSchema,
} from 'src/schema/sharedUpload.schema';
import { SharedUploadsController } from './shared-upload.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SharedUploads.name, schema: SharedUploadsSchema },
    ]),
  ],
  providers: [SharedUploadsService],
  controllers: [SharedUploadsController],
})
export class SharedUploadModule {}

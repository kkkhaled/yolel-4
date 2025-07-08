import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Report, ReportSchema } from '../../schema/reports';
import { UploadSchema } from 'src/schema/uploadSchema';
import { ReportController } from './reports.controller';
import { ReportService } from './reports.service';
import { VoteSchema } from 'src/schema/voteSchema';
import { UserSchema } from 'src/schema/userSchema';
import {
  SharedUploads,
  SharedUploadsSchema,
} from 'src/schema/sharedUpload.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Report.name, schema: ReportSchema },
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
    ]),
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [],
})
export class ReportModule {}

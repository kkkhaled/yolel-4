import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StaticsController } from './statics.controller';
import { StaticsService } from './statics.servics';
import { User, UserSchema } from '../../schema/userSchema';
import { RemovedUser, RemovedUserSchema } from '../../schema/removedUserSchema';
import { Vote, VoteSchema } from '../../schema/voteSchema';
import { Upload, UploadSchema } from '../../schema/uploadSchema';
import {
  SharedUploads,
  SharedUploadsSchema,
} from '../../schema/sharedUpload.schema';
import { ReportSchema, Report } from 'src/schema/reports';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: RemovedUser.name, schema: RemovedUserSchema },
      { name: Vote.name, schema: VoteSchema },
      { name: Upload.name, schema: UploadSchema },
      { name: SharedUploads.name, schema: SharedUploadsSchema },
      { name: Report.name, schema: ReportSchema },
    ]),
  ],
  controllers: [StaticsController],
  providers: [StaticsService],
})
export class StaticsModule {}

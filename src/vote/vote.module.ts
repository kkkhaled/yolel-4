import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VoteSchema } from 'src/schema/voteSchema';
import { VotesController } from './vote.controller';
import { VotesService } from './vote.service';
import { UserSchema } from 'src/schema/userSchema';
import { UploadSchema } from 'src/schema/uploadSchema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Vote', schema: VoteSchema },
      {
        name: 'User',
        schema: UserSchema,
      },
      {
        name: 'Upload',
        schema: UploadSchema,
      },
    ]),
  ],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [],
})
export class VoteModule {}

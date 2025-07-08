import { Module } from '@nestjs/common';
import { SharedVotesService } from './shared-votes.service';
import { MongooseModule } from '@nestjs/mongoose';
import { SharedVotes, SharedVotesSchema } from 'src/schema/sharedVoteSchema';
import { SharedVotesController } from './shared-votes.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SharedVotes.name, schema: SharedVotesSchema },
    ]),
  ],
  providers: [SharedVotesService],
  controllers: [SharedVotesController],
})
export class SharedVotesModule {}

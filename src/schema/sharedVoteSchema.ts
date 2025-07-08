import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Vote } from './voteSchema';
import { User } from './userSchema';

@Schema({ timestamps: true })
export class SharedVotes extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Vote' })
  vote: Vote;
  @Prop({ default: 1 })
  count: number;
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  })
  user:User;
}

export const SharedVotesSchema = SchemaFactory.createForClass(SharedVotes);

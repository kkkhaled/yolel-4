import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { AgeType, Upload } from './uploadSchema';

@Schema({ timestamps: true })
export class Vote extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Upload' })
  imageOne: Upload;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Upload' })
  imageTwo: Upload;

  @Prop({ default: 0 })
  imageOneVoteNumber: number;

  @Prop({ default: 0 })
  imageTwoVoteNumber: number;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] })
  interactedUsers: mongoose.Types.ObjectId[];

  @Prop({ type: String })
  gender: string;

  @Prop({ enum: AgeType })
  ageType: AgeType;

}

export const VoteSchema = SchemaFactory.createForClass(Vote);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from 'src/auth/types/User';

export enum AgeType {
  Child = 'child',
  Teenager = 'teenager',
  Youth = 'youth',
  Old = 'old',
}

@Schema({ timestamps: true })
export class Upload extends Document {
  @Prop({ required: true })
  imageUrl: string;

  @Prop()
  imagePath: string;

  @Prop({ default: 0 })
  voteNum: number;

  @Prop({ default: 0 })
  VotingBestNum: number; // for return number image is best in all votes like(20/50) is the best 20 times from 50 vote

  @Prop({ enum: AgeType, required: true, message: 'agetype is required' })
  ageType: AgeType;

  @Prop({ required: true, message: 'gender is required' })
  gender: string;

  @Prop({ default: true })
  isAllowForVote: boolean;

  @Prop({ default: false, type: Boolean })
  isAdminCreated: boolean;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: User;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vote' }] })
  bestVotes: mongoose.Types.ObjectId[];

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vote' }] })
  votes: mongoose.Types.ObjectId[];

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Vote' }] })
  InteractedVotes: mongoose.Types.ObjectId[];

  @Prop({ type: Number, min: 1, max: 10, index: true })
  level?: number;

  @Prop({ type: Number, default: 0, index: true })
  levelPercentage: number;
}

export const UploadSchema = SchemaFactory.createForClass(Upload);
UploadSchema.index({ user: 1 });
UploadSchema.index({ level: 1, user: 1 });
UploadSchema.index({ levelPercentage: -1 });

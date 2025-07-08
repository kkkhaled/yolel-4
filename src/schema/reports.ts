import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Upload } from './uploadSchema';
import { User } from 'src/auth/types/User';

@Schema({ timestamps: true })
export class Report extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Upload' })
  upload: Upload;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  user: string;
}

export const ReportSchema = SchemaFactory.createForClass(Report);

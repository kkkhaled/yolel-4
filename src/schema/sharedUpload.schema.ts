import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { User } from './userSchema';
import { Upload } from './uploadSchema';

@Schema({ timestamps: true })
export class SharedUploads extends Document {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Upload' })
  image: Upload;

  @Prop({ default: 1 })
  count: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  })
  user: User;
}

export const SharedUploadsSchema = SchemaFactory.createForClass(SharedUploads);

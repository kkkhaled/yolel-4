import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true })
export class DeletedUploads extends Document {
  @Prop({ type: Number })
  count: number;
}

export const DeletedUploadsSchema =
  SchemaFactory.createForClass(DeletedUploads);

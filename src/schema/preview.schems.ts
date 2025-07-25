import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Preview extends Document {
  @Prop({
    type: Boolean,
    default: false,
  })
  isPreview: boolean;
}

export const PreviewSchema = SchemaFactory.createForClass(Preview);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class RefusedImages extends Document {
  @Prop()
  imageUrl: string;

  @Prop({ required: true })
  refusalReason: string;

  @Prop()
  gender?: string;

  @Prop()
  ageType?: string;
}

export const RefusedImagesSchema = SchemaFactory.createForClass(RefusedImages);

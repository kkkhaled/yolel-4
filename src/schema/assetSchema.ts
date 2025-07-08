import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Asset extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  imageUrl: string;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);

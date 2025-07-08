import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { AgeType } from 'src/auth/types/User';

@Schema({ timestamps: true })
export class RemovedUser extends Document {
  @Prop()
  name: string;

  @Prop()
  email: string;

  @Prop()
  profileImage: string;

  @Prop({ enum: AgeType })
  ageType: AgeType;

  @Prop()
  gender: string;
}

export const RemovedUserSchema = SchemaFactory.createForClass(RemovedUser);

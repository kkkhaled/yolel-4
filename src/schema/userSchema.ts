import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Role } from 'src/auth/types/User';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ type: String })
  deviceToken?: string;

  @Prop({ type: String })
  notificationToken?: string;

  @Prop({
    type: Number,
    default: 0,
  })
  userPoints?: number;

  @Prop({ default: Role.User })
  role: Role;
}

export const UserSchema = SchemaFactory.createForClass(User);

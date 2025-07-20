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

  @Prop({
    default: false,
  })
  IsBlocked: boolean;

  @Prop()
  email?: string;

  @Prop()
  password: string;

  @Prop({ default: true })
  activeStatus: boolean;

  @Prop({ default: Role.User })
  role: Role;

  @Prop({ type: [{ type: mongoose.Types.ObjectId, ref: 'User' }] })
  blockedUsers: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { Upload } from './uploadSchema';
import { User } from 'src/auth/types/User';

@Schema({ timestamps: true })
export class DeletedImage extends Document {
  @Prop()
  imageUrl: string;

  @Prop()
  bestVotesNumbers: number;

  @Prop()
  interactedVotesNumbers: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
  })
  imageOwner: User;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User' })
  deletedBy: string;
}

export const DeletedImageSchema = SchemaFactory.createForClass(DeletedImage);

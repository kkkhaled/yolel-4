import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PreviewService } from './preview.service';
import { Preview, PreviewSchema } from 'src/schema/preview.schems';
import { PreviewController } from './preview.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Preview.name, schema: PreviewSchema }]),
  ],
  providers: [PreviewService],
  exports: [PreviewService],
  controllers: [PreviewController],
})
export class PreviewModule {}

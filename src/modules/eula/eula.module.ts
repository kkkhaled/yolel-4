import { Module } from '@nestjs/common';
import { EulaController } from './eula.controller';

@Module({
  controllers: [EulaController],
})
export class EulaModule {}

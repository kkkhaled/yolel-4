import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CqrsModule } from '@nestjs/cqrs';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import * as dotenv from 'dotenv';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { VoteModule } from './vote/vote.module';
import { JwtAuthGuard } from './shared/jwt-auth-guard';
import { MailUtils } from './utils/sendMail';
import { UploadModule } from './modules/uploads/upload.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ReportModule } from './modules/reports/reports.module';
import { SharedVotesModule } from './modules/shared-votes/shared-votes.module';
import { PrivacyModule } from './modules/Privacy/privacy.module';
import { TermsModule } from './modules/terms-conditions/terms.module';
import { EulaModule } from './modules/eula/eula.module';
import { SharedUploadModule } from './modules/shared-uploads/shared-upload.module';
import { StaticsModule } from './modules/statics/statics.module';
import { AssetModule } from './modules/asset/asset.module';
import { PreviewModule } from './modules/preview/previw.module';

// Load environment variables
dotenv.config();

@Module({
  imports: [
    ServeStaticModule.forRoot(
      {
        serveRoot: process.env.STORAGE_files,
        rootPath: process.env.STORAGE_files,
        serveStaticOptions: {
          index: false,
        },
      },
      {
        serveRoot: '/pages',
        rootPath: join(__dirname, '..', 'src', 'pages'),
        serveStaticOptions: { index: false },
      },
    ),
    ConfigModule.forRoot({
      envFilePath: '.env',
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.DATABASE_URL),
    CqrsModule,
    AuthModule,
    VoteModule,
    UploadModule,
    ReportModule,
    ScheduleModule.forRoot(),
    SharedVotesModule,
    SharedUploadModule,
    StaticsModule,
    PreviewModule,
    PrivacyModule,
    TermsModule,
    EulaModule,
    AssetModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtAuthGuard, MailUtils],
})
export class AppModule {}

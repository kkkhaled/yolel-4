import { Module } from '@nestjs/common';
import { MongooseModule, MongooseModuleOptions } from '@nestjs/mongoose';
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
import { MongoClient } from 'mongodb';

// Load environment variables
dotenv.config();

async function waitForPrimary(
  mongoUri: string,
  maxRetries = 30,
  delayMs = 2000,
) {
  if (!mongoUri) throw new Error('DATABASE_URL is empty');
  let lastErr: any = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = new MongoClient(mongoUri, {
        useUnifiedTopology: true as any,
        serverSelectionTimeoutMS: 3000,
      } as any);

      await client.connect();
      const adminDb = client.db().admin();
      const res = await adminDb
        .command({ hello: 1 })
        .catch(() => adminDb.command({ isMaster: 1 }));
      await client.close();

      if (res && (res.primary || res.ismaster === true)) {
        console.log(
          'MongoDB primary detected:',
          res.primary ?? 'this node is master',
        );
        return true;
      }

      console.log(
        `[waitForPrimary] Attempt ${i + 1}/${maxRetries}: no primary yet.`,
      );
    } catch (err: any) {
      lastErr = err;
      console.log(
        `[waitForPrimary] Attempt ${i + 1}/${maxRetries} failed: ${err.message}`,
      );
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  console.error(
    'No primary found after retries. Last error:',
    lastErr?.message ?? lastErr,
  );
  return false;
}

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
    // MongooseModule.forRoot(process.env.DATABASE_URL),
    MongooseModule.forRootAsync({
      useFactory: async (): Promise<MongooseModuleOptions> => {
        const uri = process.env.DATABASE_URL;
        if (!uri) {
          throw new Error('DATABASE_URL not set');
        }

        // تأكد من أن الـ URI يحتوي على قائمة العقد مع replicaSet=<name>
        // مثال: mongodb://user:pass@h1:27017,h2:27017,h3:27017/mydb?replicaSet=rs0
        const ok = await waitForPrimary(uri, 30, 2000);
        if (!ok) {
          throw new Error(
            'MongoDB primary not available after retries. Aborting Mongoose connection.',
          );
        }

        return {
          uri,
          // خيارات mongoose
          connectionFactory: (connection) => connection,
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 10000,
        } as MongooseModuleOptions;
      },
    }),
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

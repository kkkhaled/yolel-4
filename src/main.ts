// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import * as dotenv from 'dotenv';
// import * as admin from 'firebase-admin';
// // import * as serviceAccount from './yolel-1713362452136-firebase-adminsdk-gxb0h-e070f6a24e.json';
// import {
//   ExpressAdapter,
//   NestExpressApplication,
// } from '@nestjs/platform-express';
// import { AppLoggingInterceptor } from './interceptors/app-logger.interceptor';

// async function bootstrap() {
//   // admin.initializeApp({
//   //   credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
//   // });
//   dotenv.config();
//   const app = await NestFactory.create<NestExpressApplication>(AppModule);

//   const staticDirectory = `${process.cwd()}/src/views/`;
//   app.useStaticAssets(staticDirectory);
//   app.useGlobalInterceptors(new AppLoggingInterceptor());

//   app.enableCors();

//   // app.useStaticAssets(path.join(__dirname, '../uploads'));
//   await app.listen(process.env.PORT || 3000);
// }
// bootstrap();
// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { AppLoggingInterceptor } from './interceptors/app-logger.interceptor';
import { MongoClient } from 'mongodb';

dotenv.config();

async function waitForPrimary(
  mongoUri: string,
  maxRetries = 30,
  delayMs = 2000,
) {
  if (!mongoUri) throw new Error('MONGO URI is empty');
  let lastErr: any = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      // نستخدم MongoClient للاتصال مؤقتًا فقط لفحص hello
      const client = new MongoClient(mongoUri, {
        // تأكد من استخدام unified topology
        useUnifiedTopology: true as any,
        // قصّر وقت اختيار السيرفر حتى نتحكم بالـ retries هنا
        serverSelectionTimeoutMS: 3000,
      } as any);

      await client.connect();

      const adminDb = client.db().admin();
      // في بعض الإصدارات استخدم { hello: 1 } أو { isMaster: 1 }
      const res = await adminDb
        .command({ hello: 1 })
        .catch(() => adminDb.command({ isMaster: 1 }));
      await client.close();

      // لو فيه حقل primary أو ismaster:true نعده جاهز
      if (res && (res.primary || res.ismaster === true)) {
        console.log(
          'MongoDB primary detected:',
          res.primary ?? 'this node is master',
        );
        return true;
      }

      console.log(
        `[waitForPrimary] Attempt ${i + 1}/${maxRetries}: no primary yet. Response:`,
        res,
      );
    } catch (err) {
      lastErr = err;
      console.log(
        `[waitForPrimary] Attempt ${i + 1}/${maxRetries} failed: ${err.message}`,
      );
      // لو وصلنا هنا يبقى لم نصل للـ primary — نكرر
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }

  console.error(
    'No primary found after retries. Last error:',
    lastErr?.message ?? lastErr,
  );
  return false;
}

async function bootstrap() {
  // انتبه: عدّل قيم retries/delay حسب حاجتك
  const MONGO_URI = process.env.DATABASE_URL;
  const ok = await waitForPrimary(MONGO_URI, 30, 2000);

  if (!ok) {
    console.error(
      'MongoDB primary is not available. Exiting to avoid running post-hooks on non-primary node.',
    );
    process.exit(1);
  }

  // لو وصلنا هنا يبقى في Primary — نكمل تشغيل التطبيق
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const staticDirectory = `${process.cwd()}/src/views/`;
  app.useStaticAssets(staticDirectory);
  app.useGlobalInterceptors(new AppLoggingInterceptor());

  app.enableCors();

  await app.listen(process.env.PORT || 3000);
}
bootstrap();

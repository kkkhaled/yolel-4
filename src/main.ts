import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as admin from 'firebase-admin';
// import * as serviceAccount from './yolel-1713362452136-firebase-adminsdk-gxb0h-e070f6a24e.json';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { AppLoggingInterceptor } from './interceptors/app-logger.interceptor';

async function bootstrap() {
  // admin.initializeApp({
  //   credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  // });
  dotenv.config();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const staticDirectory = `${process.cwd()}/src/views/`;
  app.useStaticAssets(staticDirectory);
  app.useGlobalInterceptors(new AppLoggingInterceptor());

  app.enableCors();

  // app.useStaticAssets(path.join(__dirname, '../uploads'));
  await app.listen(process.env.PORT || 3000);
}
bootstrap();

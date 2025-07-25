import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../middleware/jwtStrategy';
import { UserSchema } from '../schema/userSchema';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { RemovedUserSchema } from 'src/schema/removedUserSchema';
import { MailUtils } from 'src/utils/sendMail';
import { PreviewService } from 'src/modules/preview/preview.service';
import { PreviewSchema } from 'src/schema/preview.schems';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          secret: config.get<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: config.get<string | number>('JWT_EXPIRE'),
          },
        };
      },
    }),
    MongooseModule.forFeature([
      { name: 'User', schema: UserSchema },
      { name: 'Preview', schema: PreviewSchema },
    ]),
    MongooseModule.forFeature([
      { name: 'RemovedUser', schema: RemovedUserSchema },
    ]),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(
            null,
            file.fieldname +
              '-' +
              uniqueSuffix +
              '.' +
              file.originalname.split('.').pop(),
          );
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MailUtils, PreviewService],
  exports: [JwtStrategy, PassportModule],
})
export class AuthModule {}

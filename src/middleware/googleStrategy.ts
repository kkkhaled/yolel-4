// import { Injectable } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { Strategy, VerifyCallback } from 'passport-google-oauth20';
// import { AuthService } from '../auth/auth.service';

// @Injectable()
// export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
//   constructor(private authService: AuthService) {
//     super({
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL:
//         // 'http://localhost:3000/user/google/redirect' ||
//         'http://localhost:3000/user/google/signup',
//       passReqToCallback: true,
//       scope: ['profile', 'email'],
//     });
//   }

//   async validate(
//     request: any,
//     accessToken: string,
//     refreshToken: string,
//     profile: any,
//     done: VerifyCallback,
//   ): Promise<any> {
//     const { name, emails, photos } = profile;
//     const user = {
//       email: emails[0].value,
//       name: name.givenName + ' ' + name.familyName,
//       profileImage: photos[0].value,
//       isSocialRegister: true,
//       accessToken,
//     };
//     done(null, user);
//   }
// }

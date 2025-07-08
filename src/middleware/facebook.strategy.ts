// import { Injectable } from '@nestjs/common';
// import { PassportStrategy } from '@nestjs/passport';
// import { Profile, Strategy } from 'passport-facebook';

// @Injectable()
// export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
//   constructor() {
//     super({
//       clientID: process.env.FACEBOOK_CLIENT_ID,
//       clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
//       callbackURL: 'http://localhost:3000/user/facebook/redirect',
//       scope: 'email',
//       profileFields: ['emails', 'name'],
//     });
//   }

//   async validate(
//     accessToken: string,
//     refreshToken: string,
//     profile: Profile,
//     done: (err: any, user: any, info?: any) => void,
//   ): Promise<any> {
//     const { name, emails } = profile;
//     console.log(profile);

//     const user = {
//       email: emails[0].value,
//       name: name.givenName + ' ' + name.familyName,
//       //   profileImage: photos[0].value,
//       isSocialRegister: true,
//     };
//     const payload = {
//       user,
//       accessToken,
//     };

//     done(null, payload);
//   }
// }

// import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import * as admin from 'firebase-admin';
// import { url } from 'inspector';
// import { Model } from 'mongoose';
// import { User } from 'src/schema/userSchema';

// @Injectable()
// export class FirebaseAdminService {
//   private readonly admin: admin.app.App;
//   private readonly messaging: admin.messaging.Messaging;

//   constructor(
//     @InjectModel(User.name)
//     private user: Model<User>,
//   ) {
//     this.admin = admin.app();
//     this.messaging = admin.messaging();
//   }

//   async sendToDevice(token: string, data: any) {
//     await admin.messaging().send({
//       token:
//         'fga0wvFykkT0pUHGHHOYzo:APA91bGpU4MpOK3k3BroRWKSQdco-B5TQrDhrsdj4hRMNovl22dOVNrfCZdIjmEm-A_S6pcMSnxNTKciFi40GVzcYI8ROejM-OvK5EJVsHgzvX3vHGVbsd0SWkMwgsd567B4XVkUgmEH',
//       notification: {
//         title: 'hello',
//         body: 'hello in our app',
//       },
//       data: {
//         url: '',
//       },
//     });
//   }

//   async sendToDevices(title: string, message: string, url?: string) {
//     const usersPerPage = 40; // Number of users per page
//     let currentPage = 1;
//     let tokens: string[] = [];

//     // Retrieve device tokens in batches
//     while (true) {
//       // Get users from the database or wherever you store user data
//       const users = await this.getUsers(currentPage, usersPerPage);

//       // If no more users, break the loop
//       if (users.length === 0) {
//         console.log('No more users');
//         break;
//       }

//       // Extract device tokens from users and add to tokens array
//       tokens = tokens.concat(
//         users
//           .filter((user) => user.deviceToken.trim() !== '')
//           .map((user) => user.deviceToken),
//       );
//       // Move to the next page
//       currentPage++;
//     }

//     console.log(tokens);

//     // Send messages using the collected tokens
//     const messages: admin.messaging.MulticastMessage = {
//       tokens,
//       notification: {
//         title,
//         body: message,
//       },
//       data: {
//         url,
//       },
//       apns: {
//         payload: {
//           aps: {
//             sound: 'default',
//           },
//         },
//       },
//     };
//     const response = await this.messaging.sendMulticast(messages);
//     console.log(response);

//     // Handle failed tokens
//     const failedTokens: string[] = [];
//     response.responses.forEach((resp, idx) => {
//       if (!resp.success) {
//         failedTokens.push(tokens[idx]);
//       }
//     });
//     console.log(failedTokens);
//   }

//   // Function to retrieve users from the database with pagination
//   async getUsers(page: number, pageSize: number) {
//     try {
//       // Calculate skip and limit values based on page and pageSize
//       const skip = (page - 1) * pageSize;

//       // Fetch users from the database using pagination
//       const users = await this.user.find().skip(skip).limit(pageSize).exec();

//       return users;
//     } catch (error) {
//       // Handle any errors
//       console.error('Error fetching users:', error);
//       throw error;
//     }
//   }

//   // async sendToDevices(title:string,message:string,url?:string) {

//   //   const messages: admin.messaging.MulticastMessage = {
//   //     tokens,
//   //     notification: {
//   //       title: 'hello',
//   //       body: 'hello in our app',
//   //     },
//   //   };
//   //   const response = await this.messaging.sendMulticast(messages);
//   //   const failedTokens: string[] = [];
//   //   response.responses.forEach((resp, idx) => {
//   //     if (!resp.success) {
//   //       failedTokens.push(tokens[idx]);
//   //     }
//   //   });
//   //   console.log(failedTokens);
//   // }
// }

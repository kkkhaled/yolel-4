// import { Controller, Post, Body } from '@nestjs/common';
// import { FirebaseAdminService } from './notification.service';

// @Controller('notifications')
// export class NotificationController {
//   constructor(private readonly firebaseService: FirebaseAdminService) {}

//   @Post('single')
//   async sendNotificationToSingleUser(
//     @Body() body: { token: string; message: any },
//   ): Promise<string> {
//     try {
//       const { token, message } = body;
//       await this.firebaseService.sendToDevice(token, message);
//       return 'Notification sent to single user successfully';
//     } catch (error) {
//       console.log(error);
//     }
//   }

//   @Post('multiple')
//   async sendNotificationToMultipleUsers(
//     @Body('title') title: string,
//     @Body('message') message: string,
//     @Body('url') url?: string,
//   ): Promise<string> {
//     if (!url) {
//       url = '';
//     }
//     await this.firebaseService.sendToDevices(title, message, url);
//     return 'Notification sent to multiple users successfully';
//   }
// }

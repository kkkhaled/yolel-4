import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express'; // Import the Response object from express
import { join } from 'path';

@Controller('privacy')
export class PrivacyController {
  @Get()
  async getPrivacy(@Res() res: Response) {
    // return res.sendFile(join(__dirname, '..','..', 'pages', 'privacy-policy.html'));
    return res.sendFile(
      join(process.cwd(), 'dist', 'pages', 'privacy-policy.html'),
    );
  }
}

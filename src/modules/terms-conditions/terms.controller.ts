import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express'; // Import the Response object from express
import { join } from 'path';

@Controller('terms')
export class TermsController {
  @Get()
  async getTerms(@Res() res: Response) {
    return res.sendFile(
      join(`${process.cwd()}/dist/pages/terms-and-conditions.html`),
    );
  }
}

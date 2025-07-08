import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express'; 
import { join } from 'path';

@Controller('eula')
export class EulaController {
  @Get()
  async getEula(@Res() res: Response) {
    return res.sendFile(join(`${process.cwd()}/src/views/EULA.html`));
  }
}

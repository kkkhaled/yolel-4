import { Injectable } from '@nestjs/common';

@Injectable()
export class CallbackUrlService {
  getCallbackUrl(req: any): string {
    if (req.path.includes('redirect')) {
      return 'http://localhost:3000/user/google/redirect';
    } else {
      return 'http://localhost:3000/user/google/signup';
    }
  }
}

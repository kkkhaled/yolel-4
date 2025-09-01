import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class AppLoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();

    console.log('Before...');
    const currentTime = new Date().toISOString();
    console.log(
      `${currentTime} request ${req.headers['Authorization']} ${req.url} body`,
      JSON.stringify(req.body),
    );

    const now = Date.now();
    return next.handle().pipe(
      tap(async (res) => {
        console.log(`Success... - 200`, `${Date.now() - now}ms`);
        console.log(res);
      }),
      catchError(async (error) => {
        console.log(
          `Error...`,
          error.status,
          error.response ? error.response : error,
        );
        throw error;
      }),
    );
  }
}

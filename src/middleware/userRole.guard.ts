import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from 'src/schema/userSchema';

@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  matchRoles(roles: string[], userRole: string): boolean {  
    return roles.includes(userRole);
  }

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>('roles', context.getHandler());
    if (!roles) {
      console.log('No roles specified');
      throw new HttpException('Role not found', HttpStatus.BAD_REQUEST);
    }

    const request = context.switchToHttp().getRequest();
    const user: User = request.user;
    
    if (!user) {
      throw new HttpException('User not authenticated', HttpStatus.UNAUTHORIZED);
    }
    
    return this.matchRoles(roles, user.role);  
  }
}

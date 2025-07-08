import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/shared/jwt-auth-guard';
import { User } from './types/User';
import { Roles } from 'src/decorators/role.decorator';
import { UserRoleGuard } from 'src/middleware/userRole.guard';

@Controller('user')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login-or-signup')
  async loginOrSignup(
    @Body('deviceToken') deviceToken: string,
    @Body('notificationToken') notificationToken?: string,
  ) {
    return this.authService.loginOrSignup(deviceToken, notificationToken);
  }

  // get user data by id
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Get('profile')
  @Roles('user')
  async getUserProfile(@Req() req: Request) {
    const user = req.user as User;
    return this.authService.getUserById(user.id);
  }
}

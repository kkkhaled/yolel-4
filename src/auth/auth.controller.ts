import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
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

  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Put('user-block/:id')
  @Roles('user')
  async blockUser(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User;
    return await this.authService.blockUser(user.id, id);
  }

  // block user by user
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Put('user-unblock/:id')
  @Roles('user')
  async UnblockUser(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as User;
    return await this.authService.unBlockUser(user.id, id);
  }

  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Get('blocked-list')
  @Roles('user')
  async getBlockedUsers(@Req() req: Request) {
    const user = req.user as User;
    let usersList = await this.authService.getUserBlockedUsers(user.id);
    return {
      blockedUsers: usersList,
    };
  }
}

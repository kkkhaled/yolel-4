import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { JwtAuthGuard } from 'src/shared/jwt-auth-guard';
import { User } from './types/User';
import { Roles } from 'src/decorators/role.decorator';
import { UserRoleGuard } from 'src/middleware/userRole.guard';
import { LoginDto } from './dto/login-dto';
import { RemovedUser } from 'src/schema/removedUserSchema';

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

  // update active status
  @UseGuards(JwtAuthGuard)
  @Put('update-active-status')
  async updateActiveStatus(
    @Req() req: Request,
    @Body('activeStatus') activeStatus: boolean,
  ) {
    const user = req.user as User;
    return await this.authService.updateUserActiveStatus(user.id, activeStatus);
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

  @Post('/admin/login')
  loginAdmin(@Body() loginDto: LoginDto) {
    return this.authService.loginAdmin(loginDto);
  }

  // get all removed users
  // for admin
  @Get('removed-users')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async getAllRemovedUsers(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ): Promise<{
    removedUsers: RemovedUser[];
    page: number;
    totalPages: number;
    pageSize: number;
    length: number;
  }> {
    return this.authService.getAllRemovedUsers(page, pageSize);
  }

  // get all removed users
  // for admin
  @Get('users')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return this.authService.getAllRUsers(page, pageSize);
  }

  // change user status
  // for admin
  @Put('block/:id')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async changeUserBlockStatus(@Param('id') id: string) {
    return await this.authService.ChangeBlockStatus(id);
  }

  @Get('/all-admin-blocked')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async getAllBlockedUsersByAdmin(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 10,
  ) {
    return await this.authService.getAllBlockedUsersByAdmin(page, pageSize);
  }

  @Post('/admin/signup')
 async signUpAdmin() {
   return await this.authService.signUpAdmin();
 }
}

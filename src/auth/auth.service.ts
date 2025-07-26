import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schema/userSchema';
import { JwtService } from '@nestjs/jwt';
import { RemovedUser } from 'src/schema/removedUserSchema';
import { LoginDto } from './dto/login-dto';
import * as bcrypt from 'bcryptjs';
import { CreateSubAdminDto } from './dto/create-sub-admin.dto';
import { PreviewService } from 'src/modules/preview/preview.service';
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private user: Model<User>,
    @InjectModel(RemovedUser.name) private removedUser,
    private jwtService: JwtService,
    private readonly previewService: PreviewService,
  ) {}

  async loginOrSignup(
    deviceToken: string,
    notificationToken?: string,
  ): Promise<any> {
    try {
      const preview = await this.previewService.getPreview();

      const user = await this.user.findOne({ deviceToken: deviceToken });

      if (user) {
        const token = this.jwtService.sign({ id: user._id });
        if (user.notificationToken !== notificationToken) {
          await this.user.updateOne({ _id: user._id }, { notificationToken });
        }
        return {
          token,
          user: {
            ...user.toObject(),
            is_review: preview?.isPreview ?? false,
          },
        };
      }

      const newUser = await this.user.create({
        deviceToken: deviceToken,
        notificationToken: notificationToken || '',
      });

      const token = this.jwtService.sign({ id: newUser._id });
      return {
        token,
        user: { ...newUser.toObject(), is_review: preview?.isPreview ?? false },
      };
    } catch (error) {
      throw new BadRequestException(error, 'Error in login or signup');
    }
  }

  async loginAdmin(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.user.findOne({ email });

    if (!user) {
      throw new NotFoundException('Invalid email or password');
    }

    if (user.role != 'admin' && user.role != 'sub_admin') {
      throw new BadRequestException('user is not admin');
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      return new Error('Invalid email or password');
    }

    const token = this.jwtService.sign({ id: user._id });

    return { token , role : user.role };
  }

  // get user data
  async getUserById(userId: string): Promise<User | null> {
    return this.user.findById(userId);
  }

  // update user active status
  async updateUserActiveStatus(userId: string, isActive: boolean) {
    try {
      let user = await this.user.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      } else {
        user = await this.user.findByIdAndUpdate(
          userId,
          { activeStatus: isActive },
          { new: true },
        );
        return {
          message: 'active status updated successfully',
          activeStatus: user.activeStatus,
        };
      }
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async blockUser(userId: string, userToBlockId: string) {
    try {
      // check user if found
      let user = await this.user.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      // check if user is already blocked
      if (user.blockedUsers.includes(userToBlockId)) {
        return { success: false, message: 'User is already blocked' };
      }
      // save block list for user
      await this.user.findByIdAndUpdate(userId, {
        $addToSet: { blockedUsers: userToBlockId },
      });
      return { success: true, message: 'user blocked successfully' };
    } catch (error) {
      throw new Error(`unable to block user`);
    }
  }
  // unblock user from block list by user
  async unBlockUser(userId: string, userToUnBlockId: string) {
    try {
      // Fetch the user document by userId
      const user = await this.user.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Remove userToUnBlockId from the blockedUsers array
      const updatedBlockedUsers = user.blockedUsers.filter(
        (id) => id !== userToUnBlockId,
      );

      // Update the user document with the updated blockedUsers array
      user.blockedUsers = updatedBlockedUsers;
      await user.save();

      return { success: true, message: 'User unblocked successfully' };
    } catch (error) {
      throw new Error(`Unable to unblock user: ${error.message}`);
    }
  }

  // get user blocked list
  async getUserBlockedUsers(userId: string) {
    try {
      // Fetch the user's blocked list
      const user = await this.user.findById(userId).populate('blockedUsers');
      if (!user) {
        throw new Error('User not found');
      }

      // Extract blocked users from the user document
      const blockedUsers = user.blockedUsers;

      // Fetch user data for each blocked user
      const blockedUsersWithUserData = await Promise.all(
        blockedUsers.map(async (blockedUserId) => {
          const blockedUserData = await this.user.findById(blockedUserId);
          return blockedUserData;
        }),
      );

      return blockedUsersWithUserData;
    } catch (error) {
      // Handle errors
      console.error('Error fetching blocked users:', error);
      throw new Error('Unable to fetch blocked users.');
    }
  }

  async getAllBlockedUsersByAdmin(page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;

    try {
      const users = await this.user
        .find({
          IsBlocked: true,
        })
        .skip(skip)
        .limit(pageSize);

      const totalItems = await this.user.countDocuments();
      const totalPages = Math.ceil(totalItems / pageSize);

      return {
        page: page,
        totalPages: totalPages,
        pageSize: pageSize,
        length: users.length,
        users,
      };
    } catch (error) {
      console.error('Error fetching removed users:', error);
      throw new Error('Unable to fetch removed users.');
    }
  }

  // get all blocked user by admin
  // get removed users for admin
  async getAllRUsers(page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;

    try {
      const users = await this.user.find().skip(skip).limit(pageSize);

      const totalItems = await this.user.countDocuments();
      const totalPages = Math.ceil(totalItems / pageSize);

      return {
        page: page,
        totalPages: totalPages,
        pageSize: pageSize,
        length: users.length,
        users,
      };
    } catch (error) {
      console.error('Error fetching removed users:', error);
      throw new Error('Unable to fetch removed users.');
    }
  }

  async ChangeBlockStatus(id: string) {
    try {
      let user = await this.user.findById(id);
      if (!user) {
        throw new Error(`user not found`);
      } else {
        user = await this.user.findByIdAndUpdate(
          id,
          { IsBlocked: !user.IsBlocked },
          { new: true },
        );
        return user;
      }
    } catch (error) {
      throw new Error(`unable to block user`);
    }
  }

  async getAllRemovedUsers(
    page: number = 1,
    pageSize: number = 10,
  ): Promise<{
    removedUsers: RemovedUser[];
    page: number;
    totalPages: number;
    pageSize: number;
    length: number;
  }> {
    const skip = (page - 1) * pageSize;

    try {
      const removedUsers = await this.removedUser
        .find()
        .skip(skip)
        .limit(pageSize)
        .exec();

      const totalItems = await this.removedUser.countDocuments();
      const totalPages = Math.ceil(totalItems / pageSize);

      return {
        removedUsers: removedUsers,
        page: page,
        totalPages: totalPages,
        pageSize: pageSize,
        length: removedUsers.length,
      };
    } catch (error) {
      console.error('Error fetching removed users:', error);
      throw new Error('Unable to fetch removed users.');
    }
  }

  async signUpAdmin() {
    // Check if user already exists with the provided email
    const existingUser = await this.user.findOne({
      email: 'beauty123@admin.com',
    });
    if (existingUser) {
      throw new Error('Email is already registered');
    }

    // If user does not exist, proceed with registration
    const hashedPassword = await bcrypt.hash('123456', 10);

    const user = await this.user.create({
      email: 'beauty123@admin.com',
      password: hashedPassword,
      verifyCode: '1111',
      isVerified: true,
      role: 'admin',
    });

    const token = this.jwtService.sign({ id: user._id });

    return { token };
  }

  async CreateSubAdmin(createSubAdminDto: CreateSubAdminDto) {
    // check if user already exists with the provided email
    const existingUser = await this.user.findOne({
      email: createSubAdminDto.email,
    });
    if (existingUser) {
      throw new Error('Email is already registered');
    }

    // if user does not exist, proceed with registration
    const hashedPassword = await bcrypt.hash(createSubAdminDto.password, 10);

    const user = await this.user.create({
      email: createSubAdminDto.email,
      password: hashedPassword,
      isVerified: true,
      verifyCode: Math.floor(1000 + Math.random() * 9000),
      role: 'sub_admin',
    });

    return {
      id: user._id,
      email: user.email,
      role: user.role,
    };
  }
}

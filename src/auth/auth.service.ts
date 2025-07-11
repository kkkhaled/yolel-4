import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schema/userSchema';
import { JwtService } from '@nestjs/jwt';
import { RemovedUser } from 'src/schema/removedUserSchema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private user: Model<User>,
    @InjectModel(RemovedUser.name) private removedUser,
    private jwtService: JwtService,
  ) {}

  async loginOrSignup(
    deviceToken: string,
    notificationToken?: string,
  ): Promise<any> {
    try {
      const user = await this.user.findOne({ deviceToken: deviceToken });

      if (user) {
        const token = this.jwtService.sign({ id: user._id });
        if (user.notificationToken !== notificationToken) {
          await this.user.updateOne({ _id: user._id }, { notificationToken });
        }
        return {
          token,
          user,
        };
      }

      const newUser = await this.user.create({
        deviceToken: deviceToken,
        notificationToken: notificationToken || '',
      });

      const token = this.jwtService.sign({ id: newUser._id });
      return {
        token,
        user: newUser,
      };
    } catch (error) {
      throw new BadRequestException(error, 'Error in login or signup');
    }
  }

  // get user data
  async getUserById(userId: string): Promise<User | null> {
    return this.user.findById(userId);
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
}

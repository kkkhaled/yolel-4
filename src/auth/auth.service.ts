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
}

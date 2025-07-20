import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as moment from 'moment';

import { User } from '../../schema/userSchema';
import { Vote } from '../../schema/voteSchema';
import { Upload } from '../../schema/uploadSchema';
import { RemovedUser } from '../../schema/removedUserSchema';
import { SharedUploads } from '../../schema/sharedUpload.schema';
import { Report } from 'src/schema/reports';

@Injectable()
export class StaticsService {
  constructor(
    @InjectModel(User.name)
    private user: Model<User>,
    @InjectModel(RemovedUser.name) private removedUser,
    @InjectModel(Vote.name) private voteModel: Model<Vote>,
    @InjectModel(Upload.name) private uploadModel: Model<Upload>,
    @InjectModel(SharedUploads.name) private sharedUpload: Model<SharedUploads>,
    @InjectModel(Report.name) private reportModel: Model<Report>,
  ) {}

  // get statics for last month
  async getLastMonthStatics() {
    try {
      const startDate = moment().subtract(1, 'month').toDate();
      const endDate = new Date();
      return {
        users: await this.user.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        votes: await this.voteModel.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        uploads: await this.uploadModel.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        removedUsers: await this.removedUser.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        reports: await this.reportModel.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        sharedUploads: await this.sharedUpload.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
      };
    } catch (error) {
      throw new Error('Error getting last month statics');
    }
  }

  // get last week statics
  async getLastWeekStatics() {
    try {
      const startDate = moment().subtract(1, 'week').toDate();
      const endDate = new Date();
      return {
        users: await this.user.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        votes: await this.voteModel.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        uploads: await this.uploadModel.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        removedUsers: await this.removedUser.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        reports: await this.reportModel.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        sharedUploads: await this.sharedUpload.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
      };
    } catch (error) {
      throw new Error('Error getting last week statics');
    }
  }

  // get last day statics
  async getLastDayStatics() {
    try {
      const startDate = moment().subtract(1, 'day').toDate();
      const endDate = new Date();
      return {
        users: await this.user.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        votes: await this.voteModel.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        uploads: await this.uploadModel.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        removedUsers: await this.removedUser.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        reports: await this.reportModel.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
        sharedUploads: await this.sharedUpload.countDocuments({
          createdAt: { $gte: startDate, $lte: endDate },
        }),
      };
    } catch (error) {
      throw new Error('Error getting last day statics');
    }
  }

  // get total length
  async getTotalLength() {
    return {
      users: await this.user.countDocuments(),
      activeUsers: await this.user.countDocuments({ activeStatus: true }),
      males: await this.uploadModel.countDocuments({ gender: 'male' }),
      females: await this.uploadModel.countDocuments({ gender: 'female' }),
      votes: await this.voteModel.countDocuments(),
      uploads: await this.uploadModel.countDocuments(),
      removedUsers: await this.removedUser.countDocuments(),
      reports: await this.reportModel.countDocuments(),
      sharedUploads: await this.sharedUpload.countDocuments(),
    };
  }
}

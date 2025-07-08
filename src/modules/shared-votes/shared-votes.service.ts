import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SharedVotes } from '../../schema/sharedVoteSchema';

@Injectable()
export class SharedVotesService {
  constructor(
    @InjectModel(SharedVotes.name) private sharedVotesModel: Model<SharedVotes>,
  ) {}
  // get all shared votes for admin
  async getAllSharedVotes(page: number = 1, size: number = 10) {
    const totalCount = await this.sharedVotesModel.countDocuments();
    const totalPages = Math.ceil(totalCount / size);

    const sharedVotes = await this.sharedVotesModel
      .find()
      .skip((page - 1) * size)
      .limit(size)
      .populate({
        path: 'vote',
        populate: [
          { path: 'imageOne' },
          { path: 'imageTwo' }
        ]
      })
      .exec();

    return {
      page: page,
      size: size,
      totalPages: totalPages,
      totalCount: totalCount,
      data: sharedVotes,
    };
  }

  // add sherd vote to db (for allow admin to calculate numbers of shared)
  async createSharedVote(voteId: string): Promise<SharedVotes> {
    const newSharedVote = new this.sharedVotesModel({ vote: voteId });
    return newSharedVote.save();
  }
  // increase sahred number after every time user share vote
  async updateSharedVoteCount(id: string): Promise<SharedVotes> {
    const sharedVote = await this.sharedVotesModel.findById(id);
    if (!sharedVote) {
      throw new Error(`no vote found`);
    } else {
      sharedVote.count = sharedVote.count + 1;
      return sharedVote.save();
    }
  }
}

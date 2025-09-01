import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { Vote } from '../schema/voteSchema';
import { User } from '../schema/userSchema';
import { Upload } from 'src/schema/uploadSchema';
import { Cron } from '@nestjs/schedule';
import { FilterQuery } from 'mongoose';

@Injectable()
export class VotesService {
  constructor(
    @InjectModel(Vote.name) private voteModel: Model<Vote>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Upload.name) private uploadModel: Model<Upload>,
  ) {}
  // create votes
  // @Cron('0 */1 * * * *') // Runs every 1 minute
  @Cron('0 0 */1 * * *') // Runs every hour
  // @Cron('0 */1 * * * *') // Runs every 1 minute
  async createRandomVotes(): Promise<void> {
    const PAGE_SIZE = 20; // Number of uploads to fetch per page
    let currentPage = 1;

    // Fetch and paginate through all uploads
    while (true) {
      const uploads = await this.uploadModel
        .find()
        .skip((currentPage - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .exec();

      // If no uploads are found on the current page, stop pagination
      if (uploads.length === 0) {
        break;
      }

      // Shuffle the array of uploads to randomize the selection
      const shuffledUploads = this.shuffle(uploads);

      // Iterate through the shuffled array and group uploads into pairs to create votes
      for (let i = 0; i < shuffledUploads.length; i++) {
        for (let j = i + 1; j < shuffledUploads.length; j++) {
          const uploadOne = shuffledUploads[i];
          const uploadTwo = shuffledUploads[j];

          // Check if both uploads are present
          if (uploadOne && uploadTwo) {
            // Ensure uploads have the same gender type and gender
            if (
              uploadOne.gender === uploadTwo.gender &&
              uploadOne.ageType === uploadTwo.ageType &&
              uploadOne.user !== uploadTwo.user &&
              uploadOne.isAllowForVote &&
              uploadTwo.isAllowForVote &&
              (uploadOne.user.toString() !== uploadTwo.user.toString() ||
                (uploadOne.isAdminCreated && uploadTwo.isAdminCreated))
            ) {
              // Check if the pair has been used before
              const isUsed = await this.isPairUsed(uploadOne.id, uploadTwo.id);
              if (!isUsed) {
                // Create a new vote with the pair of uploads
                const vote = new this.voteModel({
                  imageOne: uploadOne._id,
                  imageTwo: uploadTwo._id,
                  gender: uploadOne.gender,
                  ageType: uploadOne.ageType,
                });

                // Save the vote to the database
                await vote.save();
                await this.updateUploadsWithVote(uploadOne.id, vote.id);
                await this.updateUploadsWithVote(uploadTwo.id, vote.id);
                console.log('create vote end');
              }
            }
          }
        }
      }
      currentPage++; // Move to the next page
    }
  }

  // Function to shuffle an array (for random creating vote)
  private shuffle(array: any[]): any[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Function to check if the pair has been used before
  async isPairUsed(uploadId1: string, uploadId2: string): Promise<boolean> {
    const votes = await this.voteModel
      .find({
        $or: [
          { $and: [{ imageOne: uploadId1 }, { imageTwo: uploadId2 }] },
          { $and: [{ imageOne: uploadId2 }, { imageTwo: uploadId1 }] },
        ],
      })
      .exec();

    return votes.length > 0;
  }

  // for push vote id after created to its uploads(1,2)
  async updateUploadsWithVote(
    uploadId: mongoose.Types.ObjectId,
    voteId: mongoose.Types.ObjectId,
  ) {
    // Find and update the upload with the new vote ID
    await this.uploadModel.findByIdAndUpdate(
      uploadId,
      { $push: { votes: voteId } },
      { new: true },
    );
  }

  async getVotesForAdmin(page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;
    try {
      const totalItems = await this.voteModel.countDocuments();
      const totalPages = Math.ceil(totalItems / pageSize);

      const aggregatedData = await this.voteModel.aggregate([
        { $sort: { createdAt: -1 } }, // Sort by createdAt field in descending order
        { $skip: skip }, // Skip documents based on pagination
        { $limit: Number(pageSize) }, // Limit the number of documents per page
        {
          $lookup: {
            from: 'uploads', // Assuming the name of the Uploads collection
            localField: 'imageOne',
            foreignField: '_id',
            as: 'imageOne',
          },
        },
        {
          $lookup: {
            from: 'uploads', // Assuming the name of the Uploads collection
            localField: 'imageTwo',
            foreignField: '_id',
            as: 'imageTwo',
          },
        },
        {
          $addFields: {
            imageOne: { $arrayElemAt: ['$imageOne', 0] },
            imageTwo: { $arrayElemAt: ['$imageTwo', 0] },
            interactedUsers: { $size: '$interactedUsers' },
          },
        },
        {
          $project: {
            _id: 1,
            imageOne: {
              _id: '$imageOne._id',
              imageUrl: '$imageOne.imageUrl',
              user: '$imageOne.user',
              gender: '$imageOne.gender',
              ageType: '$imageOne.ageType',
            },
            imageTwo: {
              _id: '$imageTwo._id',
              imageUrl: '$imageTwo.imageUrl',
              user: '$imageTwo.user',
              gender: '$imageTwo.gender',
              ageType: '$imageTwo.ageType',
            },
            imageOneVoteNumber: 1,
            imageTwoVoteNumber: 1,
            interactedUsers: 1,
          },
        },
      ]);

      return {
        votes: aggregatedData,
        page: page,
        totalPages: totalPages,
        pageSize: pageSize,
        totalItems: totalItems,
      };
    } catch (error) {
      throw new Error('Unable to fetch votes for admin');
    }
  }

  async getAllVotes(
    userId: string,
    page: number = 1,
    pageSize: number = 20,
    gender?: string,
    ageType?: string,
    userPoints?: number,
  ) {
    const skip = (page - 1) * pageSize;

    try {
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const blockedUsers = user.blockedUsers || [];

      let query: FilterQuery<Vote> = {
        interactedUsers: { $nin: [userId] },
      };

      if (gender) {
        query = {
          ...query,
          gender: gender,
        };
      }

      if (ageType) {
        query = {
          ...query,
          ageType: ageType,
        };
      }

      console.log(query);

      const totalItems = await this.voteModel.countDocuments(query);
      const totalPages = Math.ceil(totalItems / pageSize);

      const votes = await this.voteModel
        .find(query)
        .skip(skip)
        .limit(pageSize)
        .populate({
          path: 'imageOne',
          select: 'imageUrl user',
        })
        .populate({
          path: 'imageTwo',
          select: 'imageUrl user',
        })
        .sort({ voteEnhancementCount: -1, createdAt: -1 });

      // Filter the votes array
      const filteredVotes = votes.filter((vote) => {
        // Check if neither imageOne.user nor imageTwo.user is equal to userId
        const neitherUserIsOwner =
          vote.imageOne.user.toString() !== userId &&
          vote.imageTwo.user.toString() !== userId;

        // Check if neither imageOne.user nor imageTwo.user is in the blockedUsers list
        const neitherUserIsBlocked =
          !blockedUsers.includes(vote.imageOne.user.toString()) &&
          !blockedUsers.includes(vote.imageTwo.user.toString());

        // Return true if both conditions are true
        return neitherUserIsOwner && neitherUserIsBlocked;
      });

      let modifiedVotes = filteredVotes.map((vote) => {
        return {
          id: vote._id,
          imageOne: vote.imageOne,
          imageTwo: vote.imageTwo,
          imageOneVoteNumber: vote.imageOneVoteNumber,
          imageTwoVoteNumber: vote.imageTwoVoteNumber,
          interactedUsers: vote.interactedUsers.length,
        };
      });

      return {
        votes: modifiedVotes,
        page: page,
        totalPages: totalPages,
        pageSize: pageSize,
        userPoints: userPoints,
        totalItems: totalItems,
      };
    } catch (error) {
      // Handle errors
      console.error('Error fetching votes:', error);
      throw new Error('Unable to fetch votes.');
    }
  }

  // get vote by id
  async getVote(voteId: string) {
    try {
      const vote = await this.voteModel.findById({ _id: voteId });
      if (!vote) {
        throw new Error('Vote not found');
      }
      return { vote };
    } catch (error) {
      console.log(error);
      throw new Error('Unable to fetch vote.');
    }
  }
  // update
  async updateVote(userChoice: string, voteId: string, userId: string) {
    try {
      const vote = await this.voteModel
        .findById(voteId)
        .populate('imageOne')
        .populate('imageTwo');

      if (!vote) {
        throw new Error('Vote not found');
      }

      if (userChoice !== 'imageOne' && userChoice !== 'imageTwo') {
        throw new Error('Invalid user choice');
      }

      // Save vote counts BEFORE user's choice
      const imageOneVotesBefore = vote.imageOneVoteNumber;
      const imageTwoVotesBefore = vote.imageTwoVoteNumber;

      // Update vote count
      if (userChoice === 'imageOne') {
        vote.imageOneVoteNumber += 1;
      } else {
        vote.imageTwoVoteNumber += 1;
      }

      // Update interacted users
      const userIdObject = new mongoose.Types.ObjectId(userId);
      if (!vote.interactedUsers.includes(userIdObject)) {
        vote.interactedUsers.push(userIdObject);
      }

      // Update user points
      const user = await this.userModel.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const isImageOneStronger = imageOneVotesBefore > imageTwoVotesBefore;
      const isImageTwoStronger = imageTwoVotesBefore > imageOneVotesBefore;

      if (
        (userChoice === 'imageOne' &&
          (isImageOneStronger ||
            imageOneVotesBefore === imageTwoVotesBefore)) ||
        (userChoice === 'imageTwo' &&
          (isImageTwoStronger || imageOneVotesBefore === imageTwoVotesBefore))
      ) {
        user.userPoints += 1;
      } else {
        user.userPoints -= 1;
      }

      await user.save();

      this.updateBestAndWorstVotes(vote);
      const result = await vote.save();

      await this.updateUploadsWithInteractedVote(vote?.imageOne?.id, vote.id);
      await this.updateUploadsWithInteractedVote(vote?.imageTwo?.id, vote.id);

      return { result, userPoints: user.userPoints };
    } catch (error) {
      console.error(error);
      throw new Error('Error updating vote');
    }
  }

  // for update votes images (interacted votes) after update vote
  async updateUploadsWithInteractedVote(
    uploadId: mongoose.Types.ObjectId,
    voteId: mongoose.Types.ObjectId,
  ) {
    try {
      // Fetch the Upload document
      const upload = await this.uploadModel.findById(uploadId);

      if (!upload) {
        throw new Error('Upload not found');
      }

      // Check if voteId is already in the InteractedVotes array
      const isInInteractedVotes = upload.InteractedVotes.includes(voteId);

      // If voteId is not in the InteractedVotes array, push it into InteractedVotes
      if (!isInInteractedVotes) {
        upload.InteractedVotes.push(voteId);

        // Save the updated Upload document
        const updatedUpload = await upload.save();

        // Log or handle success
        console.log('Upload updated successfully');
      } else {
        // Log or handle case where voteId is already in InteractedVotes
        console.log('Vote is already interacted with.');
      }
    } catch (error) {
      // Log or handle error
      console.error('Error updating upload:', error);
      throw new Error('Error updating upload');
    }
  }

  // update best vote in every image after update request
  private async updateBestAndWorstVotes(vote: Vote) {
    const isImageOneBigger = vote.imageOneVoteNumber > vote.imageTwoVoteNumber;
    const biggestVoteNumber = isImageOneBigger
      ? vote.imageOneVoteNumber
      : vote.imageTwoVoteNumber;
    const lowestVoteNumber = isImageOneBigger
      ? vote.imageTwoVoteNumber
      : vote.imageOneVoteNumber;

    // Check and update bestVotes for imageOne
    if (
      biggestVoteNumber === vote.imageOneVoteNumber &&
      !vote.imageOne.bestVotes.includes(vote.id)
    ) {
      vote.imageOne.bestVotes.push(vote.id);
      await vote.imageOne.save(); // Save changes to imageOne
    }

    // Check and update bestVotes for imageTwo
    if (
      biggestVoteNumber === vote.imageTwoVoteNumber &&
      !vote.imageTwo.bestVotes.includes(vote.id)
    ) {
      vote.imageTwo.bestVotes.push(vote.id);
      await vote.imageTwo.save(); // Save changes to imageTwo
    }

    // Check and remove voteId from bestVotes for imageOne
    if (
      lowestVoteNumber === vote.imageOneVoteNumber &&
      vote.imageOne.bestVotes.includes(vote.id)
    ) {
      const index = vote.imageOne.bestVotes.indexOf(vote.id);
      vote.imageOne.bestVotes.splice(index, 1);
      await vote.imageOne.save(); // Save changes to imageOne
    }

    // Check and remove voteId from bestVotes for imageTwo
    if (
      lowestVoteNumber === vote.imageTwoVoteNumber &&
      vote.imageTwo.bestVotes.includes(vote.id)
    ) {
      const index = vote.imageTwo.bestVotes.indexOf(vote.id);
      vote.imageTwo.bestVotes.splice(index, 1);
      await vote.imageTwo.save(); // Save changes to imageTwo
    }

    // Additional checks for equal vote numbers
    if (vote.imageOneVoteNumber === vote.imageTwoVoteNumber) {
      // Check and remove voteId from bestVotes for imageOne
      if (vote.imageOne.bestVotes.includes(vote.id)) {
        const index = vote.imageOne.bestVotes.indexOf(vote.id);
        vote.imageOne.bestVotes.splice(index, 1);
        await vote.imageOne.save(); // Save changes to imageOne
      }
      // Check and remove voteId from bestVotes for imageTwo
      if (vote.imageTwo.bestVotes.includes(vote.id)) {
        const index = vote.imageTwo.bestVotes.indexOf(vote.id);
        vote.imageTwo.bestVotes.splice(index, 1);
        await vote.imageTwo.save(); // Save changes to imageTwo
      }
    }
  }

  async updateVotesWithGenderAndAgeType() {
    const votes = await this.voteModel.find({}).lean();

    for (const vote of votes) {
      const imageOne = vote.imageOne;
      const imageTwo = vote.imageTwo;

      const upload = await this.uploadModel.findOne({
        _id: imageOne || imageTwo,
      });

      if (!upload) continue;

      await this.voteModel.updateOne(
        { _id: vote._id },
        {
          $set: {
            gender: upload.gender,
            ageType: upload.ageType,
          },
        },
      );
    }

    return { message: 'Votes updated successfully' };
  }

  async findByUserVotesSortedByOwnUploadId(params: {
    userId: string;
    page?: number;
    limit?: number;
    sortOrder?: 'asc' | 'desc';
  }) {
    try {
      const { userId, page = 1, limit = 10, sortOrder = 'asc' } = params;

      const userObjectId = new Types.ObjectId(userId);
      const skip = (page - 1) * limit;
      const dir = sortOrder === 'asc' ? 1 : -1;

      const pipeline: any = [
        // Join upload docs for imageOne
        {
          $lookup: {
            from: 'uploads',
            localField: 'imageOne',
            foreignField: '_id',
            as: 'imageOneDoc',
          },
        },
        { $unwind: { path: '$imageOneDoc', preserveNullAndEmptyArrays: true } },

        // Join upload docs for imageTwo
        {
          $lookup: {
            from: 'uploads',
            localField: 'imageTwo',
            foreignField: '_id',
            as: 'imageTwoDoc',
          },
        },
        { $unwind: { path: '$imageTwoDoc', preserveNullAndEmptyArrays: true } },

        // Compute the upload owned by the user in this vote
        {
          $addFields: {
            ownUploadId: {
              $cond: [
                { $eq: ['$imageOneDoc.user', userObjectId] },
                '$imageOneDoc._id',
                {
                  $cond: [
                    { $eq: ['$imageTwoDoc.user', userObjectId] },
                    '$imageTwoDoc._id',
                    null,
                  ],
                },
              ],
            },
          },
        },

        // Keep only votes related to this user
        { $match: { ownUploadId: { $ne: null } } },

        // Output shape
        {
          $project: {
            imageOne: 1,
            imageTwo: 1,
            imageOneVoteNumber: 1,
            imageTwoVoteNumber: 1,
            interactedUsers: 1,
            gender: 1,
            ageType: 1,
            createdAt: 1,
            updatedAt: 1,
            imageOneDoc: 1,
            imageTwoDoc: 1,
            ownUploadId: 1,
          },
        },

        // Sort by user-owned upload id (tie-break by createdAt for stable order)
        { $sort: { ownUploadId: dir, createdAt: -1 } },

        // Pagination + total count
        {
          $facet: {
            data: [{ $skip: skip }, { $limit: limit }],
            totalCount: [{ $count: 'count' }],
          },
        },
        {
          $addFields: {
            total: { $ifNull: [{ $arrayElemAt: ['$totalCount.count', 0] }, 0] },
          },
        },
        { $project: { totalCount: 0 } },
      ];

      const [result] = await this.voteModel.aggregate(pipeline);
      const total = result?.total ?? 0;

      return {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        data: result?.data ?? [],
      };
    } catch (error) {
      console.log(error);
      throw new Error('Unable to fetch votes.');
    }
  }
}

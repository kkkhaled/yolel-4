import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { Upload } from '../../schema/uploadSchema';
import { Vote } from '../../schema/voteSchema';
import { CreateUploadDto } from './dto/create-upload.dto';
import { deleteImage } from 'src/utils/removeImages';
import { SharedUploads } from 'src/schema/sharedUpload.schema';
import { Report } from 'src/schema/reports';

@Injectable()
export class UploadService {
  constructor(
    @InjectModel(Upload.name) private uploadModel: Model<Upload>,
    @InjectModel(Vote.name) private voteModel: Model<Upload>,
    @InjectModel(SharedUploads.name) private sharedUpload: Model<SharedUploads>,
    @InjectModel(Report.name) private reportModel: Model<Report>,
  ) {}

  async findById(id: string) {
    try {
      const IdObject = new mongoose.Types.ObjectId(id); // Create an ObjectId instance
      const aggregatedData = await this.uploadModel.aggregate([
        { $match: { _id: IdObject } },
        {
          $project: {
            _id: 1,
            imageUrl: 1,
            imagePath: 1,
            ageType: 1,
            gender: 1,
            user: 1,
            InteractedVotesLength: { $size: '$InteractedVotes' },
            bestVotesLength: { $size: '$bestVotes' },
            votesLength: { $size: '$votes' },
          },
        },
      ]);

      if (aggregatedData.length === 0) {
        throw new Error('Upload not found');
      }

      return aggregatedData[0];
    } catch (error) {
      console.error(error);
      throw new Error('Unable to fetch upload');
    }
  }
  // async findById(id: string) {
  //   let upload = await this.uploadModel.findById(id);
  //   return {
  //     _id: upload._id,
  //     imageUrl: upload.imageUrl,
  //     imagePath: upload.imagePath,
  //     ageType: upload.ageType,
  //     gender: upload.gender,
  //     user: upload.user,
  //     InteractedVotesLength: upload.InteractedVotes.length,
  //     bestVotesLength: upload.bestVotes.length,
  //     votesLength: upload.votes.length,
  //   };
  // }

  async findAllForAdmin(page: number = 1, pageSize: number = 10) {
    try {
      const skip = (page - 1) * pageSize;

      // Aggregation pipeline to fetch uploads with modified fields
      const aggregatedData = await this.uploadModel.aggregate([
        { $sort: { createdAt: -1 } }, // Sort by createdAt field in descending order
        { $skip: skip }, // Skip documents based on pagination
        { $limit: Number(pageSize) }, // Convert pageSize to number explicitly
        {
          $lookup: {
            from: 'users', // Assuming the name of the Users collection
            localField: 'user',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $addFields: {
            InteractedVotesLength: { $size: '$InteractedVotes' },
            bestVotesLength: { $size: '$bestVotes' },
            votesLength: { $size: '$votes' },
          },
        },
        {
          $project: {
            _id: 1,
            imageUrl: 1,
            imagePath: 1,
            ageType: 1,
            gender: 1,
            'user._id': '$user._id', // Include only the _id field of the user
            'user.name': '$user.name', // Include only the name field of the user
            InteractedVotesLength: 1,
            bestVotesLength: 1,
            votesLength: 1,
          },
        },
      ]);

      // Fetch total count of documents (totalItems)
      const totalItems = await this.uploadModel.countDocuments();

      return {
        page: page,
        pageSize: pageSize,
        totalItems: totalItems,
        items: aggregatedData,
      };
    } catch (error) {
      console.error(error);
      throw new Error('Unable to fetch uploads for admin');
    }
  }

  // async findAllForAdmin(page: number = 1, pageSize: number = 10) {
  //   const skip = (page - 1) * pageSize;
  //   const totalItems = await this.uploadModel.countDocuments();

  //   const uploads = await this.uploadModel
  //     .find()
  //     .skip(skip)
  //     .limit(pageSize)
  //     .sort({ createdAt: -1 })
  //     .populate({
  //       path: 'user',
  //       select: 'name',
  //     });

  //   // Map over uploads array to modify each upload object
  //   const modifiedUploads = uploads.map((upload) => {
  //     return {
  //       _id: upload._id,
  //       imageUrl: upload.imageUrl,
  //       imagePath: upload.imagePath,
  //       ageType: upload.ageType,
  //       gender: upload.gender,
  //       user: upload.user,
  //       InteractedVotesLength: upload.InteractedVotes.length,
  //       bestVotesLength: upload.bestVotes.length,
  //       votesLength: upload.votes.length,
  //     };
  //   });

  //   return {
  //     page: page,
  //     pageSize: pageSize,
  //     totalItems: totalItems,
  //     items: modifiedUploads,
  //   };
  // }

  async findByUser(userId: string, page: number = 1, pageSize: number = 10) {
    try {
      const skip = (page - 1) * pageSize;

      // Aggregation pipeline to fetch uploads by user with modified fields
      const aggregatedData = await this.uploadModel.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } }, // Match documents by userId
        { $sort: { createdAt: -1 } }, // Sort by createdAt field in descending order
        { $skip: skip }, // Skip documents based on pagination
        { $limit: Number(pageSize) }, // Limit the number of documents per page
        {
          $addFields: {
            InteractedVotesLength: { $size: '$InteractedVotes' },
            bestVotesLength: { $size: '$bestVotes' },
            votesLength: { $size: '$votes' },
            user: '$user', // Include the user field directly without populating
          },
        },
        {
          $project: {
            _id: 1,
            imageUrl: 1,
            imagePath: 1,
            ageType: 1,
            gender: 1,
            InteractedVotesLength: 1,
            bestVotesLength: 1,
            votesLength: 1,
            user: 1,
          },
        },
      ]);

      // Fetch total count of documents (totalItems)
      const totalItems = await this.uploadModel.countDocuments({
        user: userId,
      });

      return {
        page: page,
        pageSize: pageSize,
        totalItems: totalItems,
        items: aggregatedData,
      };
    } catch (error) {
      console.error(error);
      throw new Error('Unable to fetch uploads by user');
    }
  }

  // async findByUser(userId: string, page: number = 1, pageSize: number = 10) {
  //   const skip = (page - 1) * pageSize;
  //   const totalItems = await this.uploadModel.countDocuments({ user: userId });

  //   const uploads = await this.uploadModel
  //     .find({ user: userId })
  //     .skip(skip)
  //     .limit(pageSize)
  //     .sort({ createdAt: -1 });

  //   // Map over uploads array to modify each upload object
  //   const modifiedUploads = uploads.map((upload) => {
  //     return {
  //       _id: upload._id,
  //       imageUrl: upload.imageUrl,
  //       imagePath: upload.imagePath,
  //       ageType: upload.ageType,
  //       gender: upload.gender,
  //       user: upload.user,
  //       InteractedVotesLength: upload.InteractedVotes.length,
  //       bestVotesLength: upload.bestVotes.length,
  //       votesLength: upload.votes.length,
  //     };
  //   });

  //   return {
  //     page: page,
  //     pageSize: pageSize,
  //     totalItems: totalItems,
  //     items: modifiedUploads,
  //   };
  // }

  async create(createUploadDto: CreateUploadDto) {
    const createdUpload = new this.uploadModel(createUploadDto);
    return createdUpload.save();
  }
  // update upload statue for voting
  async updateUploadVoteStatus(uploadId: string) {
    let upload = await this.uploadModel.findById(uploadId);
    if (!upload) {
      throw new Error('No upload found');
    }
    upload = await this.uploadModel.findByIdAndUpdate(
      uploadId,
      { isAllowForVote: !upload.isAllowForVote },
      { new: true },
    );
    return upload;
  }
  // remove upload
  async remove(uploadId: string) {
    let upload = await this.uploadModel.findById(uploadId);
    if (!upload) {
      throw new Error('No upload found');
    }
    await this.uploadModel.findByIdAndDelete(uploadId);
    await deleteImage(upload.imageUrl);
    // delete all votes associated
    await this.deleteAssociatedVotes(upload.votes);
    // delete all shared associated
    await this.sharedUpload.deleteMany({
      image: uploadId,
    });

    await this.reportModel.deleteMany({
      upload: uploadId
    })
    // delete all reports associated
    // await this.reportModel.deleteMany({
    //   upload: uploadId,
    // });
    return { message: 'deleted' };
  }
  // for remove voting after remove its upload
  private async deleteAssociatedVotes(voteIds: mongoose.Types.ObjectId[]) {
    try {
      // Delete votes using deleteMany
      await this.voteModel.deleteMany({ _id: { $in: voteIds } });
    } catch (error) {
      // Handle error
      throw new Error('Error deleting associated votes');
    }
  }

  async resetUploads() {
    try {
      // Fetch all uploads
      const uploads = await this.uploadModel.find().exec();

      // Iterate over each upload
      for (const upload of uploads) {
        // Set bestVotes, votes, and interactedVotes to empty arrays
        upload.bestVotes = [];
        upload.votes = [];
        upload.InteractedVotes = [];

        // Save the updated upload
        await upload.save();
      }

      console.log('Uploads reset successfully.');
    } catch (error) {
      console.error('Error resetting uploads:', error);
    }
  }
}

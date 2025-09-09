import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model, Types } from 'mongoose';
import { Upload } from '../../schema/uploadSchema';
import { Vote } from '../../schema/voteSchema';
import { CreateUploadDto } from './dto/create-upload.dto';
// import { deleteImage } from 'src/utils/removeImages';
import { SharedUploads } from 'src/schema/sharedUpload.schema';
import { Report } from 'src/schema/reports';
import { DeletedUploads } from 'src/schema/deleted-upload';
import { DeletedImage } from 'src/schema/deleted-images';
import { computeLevel } from './utils/uplaod.util';
import { GetUploadsByUserLevelsDto } from './dto/get-user-levels-uplaods.dto';
import { RefusedImages } from 'src/schema/refused-images';

@Injectable()
export class UploadService {
  constructor(
    @InjectModel(Upload.name) private uploadModel: Model<Upload>,
    @InjectModel(Vote.name) private voteModel: Model<Upload>,
    @InjectModel(SharedUploads.name) private sharedUpload: Model<SharedUploads>,
    @InjectModel(Report.name) private reportModel: Model<Report>,
    @InjectModel(DeletedUploads.name)
    private deletedUploads: Model<DeletedUploads>,
    @InjectModel(DeletedImage.name)
    private deletedImage: Model<DeletedImage>,
    @InjectModel(RefusedImages.name)
    private refusedImage: Model<RefusedImages>,
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

  async searchUploadsByPercentage(
    percentage: number,
    page: number,
    limit: number,
  ) {
    try {
      const thresholds = {
        10: { min: 99.99, max: Infinity },
        9: { min: 99.97, max: 99.99 },
        8: { min: 99.37, max: 99.97 },
        7: { min: 93.31, max: 99.37 },
        6: { min: 69.14, max: 93.31 },
        5: { min: 30.85, max: 69.14 },
        4: { min: 6.68, max: 30.85 },
        3: { min: 0.62, max: 6.68 },
        2: { min: 0.02, max: 0.62 },
        1: { min: -Infinity, max: 0.02 },
      };

      if (percentage == 0) {
        const total = await this.uploadModel.countDocuments({
          InteractedVotes: { $size: 0 },
        });

        const uploads = await this.uploadModel
          .find({ InteractedVotes: { $size: 0 } })
          .skip((page - 1) * limit)
          .limit(limit);

        return { total, uploads };
      } else {
        const range = thresholds[percentage];
        if (!range) {
          throw new BadRequestException('Invalid percentage value');
        }

        const filter = {
          $expr: {
            $and: [
              { $gt: [{ $size: '$InteractedVotes' }, 0] },
              {
                $gte: [
                  {
                    $cond: {
                      if: { $gt: [{ $size: '$InteractedVotes' }, 0] },
                      then: {
                        $divide: [
                          { $size: '$bestVotes' },
                          { $size: '$InteractedVotes' },
                        ],
                      },
                      else: 0,
                    },
                  },
                  range.min / 100,
                ],
              },
              {
                $lt: [
                  {
                    $cond: {
                      if: { $gt: [{ $size: '$InteractedVotes' }, 0] },
                      then: {
                        $divide: [
                          { $size: '$bestVotes' },
                          { $size: '$InteractedVotes' },
                        ],
                      },
                      else: 0,
                    },
                  },
                  range.max / 100,
                ],
              },
            ],
          },
        };

        // Count the total number of matching documents
        const total = await this.uploadModel.countDocuments(filter);

        // Fetch paginated results
        const uploads = await this.uploadModel
          .find(filter)
          .skip((page - 1) * limit)
          .limit(limit);

        return { total, uploads };
      }
    } catch (error) {
      console.log(error);

      throw new BadRequestException(error);
    }
  }

  async create(createUploadDto: CreateUploadDto) {
    const createdUpload = new this.uploadModel(createUploadDto);
    return createdUpload.save();
  }

  async createRefusedImage(data: {
    imageUrl: string;
    refusalReason: string;
    gender?: string;
    ageType?: string;
  }) {
    const refusedImage = new this.refusedImage({
      imageUrl: data.imageUrl,
      refusalReason: data.refusalReason,
      gender: data.gender,
      ageType: data.ageType,
    });
    return refusedImage.save();
  }

  // get all refused image with paginated
  async getRefusedImages(page: number = 1, pageSize: number = 10) {
    const refusedImage = await this.refusedImage
      .find()
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    const total = await this.refusedImage.countDocuments();

    return { refusedImage, total };
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
  async remove(uploadId: string, userId: string) {
    let upload = await this.uploadModel.findById(uploadId);
    if (!upload) {
      throw new Error('No upload found');
    }
    await this.uploadModel.findByIdAndDelete(uploadId);
    // await deleteImage(upload.imageUrl);
    // delete all votes associated
    await this.deleteAssociatedVotes(upload.votes);
    // delete all shared associated
    await this.sharedUpload.deleteMany({
      image: uploadId,
    });

    await this.reportModel.deleteMany({
      upload: uploadId,
    });

    await this.deletedImage.create({
      imageUrl: upload.imageUrl,
      bestVotesNumbers: upload.bestVotes.length,
      interactedVotesNumbers: upload.InteractedVotes.length,
      imageOwner: upload.user,
      deletedBy: userId,
    });

    await this.uploadModel.findByIdAndDelete(uploadId);

    let deletedCount = await this.deletedUploads.find();
    if (deletedCount.length > 0) {
      await this.deletedUploads.findByIdAndUpdate(deletedCount[0]._id, {
        $inc: {
          count: 1,
        },
      });
    } else {
      await this.deletedUploads.create({
        count: 1,
      });
    }

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

  async getDeletedImagesCount() {
    console.log('get deleted images count');

    const deletedCount = await this.deletedUploads.find();
    return { count: deletedCount[0]?.count || 0 };
  }

  async getDeletedUploads(page: number = 1, pageSize: number = 10) {
    try {
      const result = await this.deletedImage
        .find()
        .skip((page - 1) * pageSize)
        .limit(pageSize);

      return result;
    } catch (error) {
      console.error('Error fetching deleted uploads:', error);
      throw new Error('Unable to fetch deleted uploads');
    }
  }

  async getUploadsByUserLevels(
    params: GetUploadsByUserLevelsDto,
    userId: string,
  ) {
    const {
      page = 1,
      limit = 20,
      includeSelf = true,
      sort = 'level',
      order = 'desc',
    } = params;

    const userObjId = new Types.ObjectId(userId);
    const skip = (page - 1) * limit;
    const dir = order === 'asc' ? 1 : -1;

    const userLevels: number[] = await this.uploadModel.distinct('level', {
      user: userObjId,
      level: { $ne: null },
    });

    if (!userLevels.length) {
      return {
        page,
        limit,
        total: 0,
        totalPages: 0,
        levels: [],
        uploads: [],
      };
    }

    const filter: any = { level: { $in: userLevels } };
    filter.user = { $ne: userObjId };
    if (!includeSelf) filter.user = { $ne: userObjId };

    const total = await this.uploadModel.countDocuments(filter);

    const sortSpec: Record<string, 1 | -1> = {};
    if (sort === 'level') sortSpec.level = dir;
    if (sort === 'createdAt') sortSpec.createdAt = dir;
    if (!sortSpec.createdAt) sortSpec.createdAt = -1;

    const uploads = await this.uploadModel
      .find(filter)
      .sort(sortSpec)
      .skip(skip)
      .limit(limit);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      levels: userLevels, // helpful context for the client
      uploads,
    };
  }

  async migrateUploadLevels() {
    const cursor = await this.uploadModel
      .find({}, { _id: 1, bestVotes: 1, InteractedVotes: 1 })
      .lean()
      .cursor();

    for await (const u of cursor) {
      const best = Array.isArray(u.bestVotes) ? u.bestVotes.length : 0;
      const inter = Array.isArray(u.InteractedVotes)
        ? u.InteractedVotes.length
        : 0;
      const level = computeLevel(best, inter);

      await this.uploadModel.updateOne({ _id: u._id }, { $set: { level } });
    }
  }
}

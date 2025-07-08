import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SharedUploads } from '../../schema/sharedUpload.schema';

@Injectable()
export class SharedUploadsService {
  constructor(
    @InjectModel(SharedUploads.name) private sharedUpload: Model<SharedUploads>,
  ) {}

  // get all shared uploads pagenated (for admin)
  // async getAllSharedUploads(page: number = 1, size: number = 10) {
  //   try {
  //     const totalCount = await this.sharedUpload.countDocuments();
  //     const totalPages = Math.ceil(totalCount / size);

  //     const shareduploads = await this.sharedUpload
  //       .find()
  //       .skip((page - 1) * size)
  //       .limit(size)
  //       .populate({
  //         path: 'image',
  //         select: 'imageUrl user gender ageType bestVotes InteractedVotes',
  //       })
  //       .populate({
  //         path: 'user',
  //         select: 'name email',
  //       })
  //       .exec();

  //          // Map over uploads array to modify each upload object
  //   const modifiedSharedUploads = shareduploads.map((upload) => {
  //     return {
  //       _id: upload._id,
  //       imageUrl: upload.image.imageUrl,
  //       ageType: upload.image.ageType,
  //       gender: upload.image.gender,
  //       user: upload.user,
  //       bestVotesLength: upload.image.bestVotes.length,
  //       interactedVotesLength: upload.image.InteractedVotes.length,
  //       count: upload.count
  //     };
  //   });

  //     return {
  //       page: page,
  //       size: size,
  //       totalPages: totalPages,
  //       totalCount: totalCount,
  //       data: modifiedSharedUploads,
  //     };
  //   } catch (error) {
  //     console.log(error);
      
  //     throw new Error('Unable to fetch shared uploads');
  //   }
  // }
  async getAllSharedUploads(page: number = 1, size: number = 10) {
    page = Number(page); // Convert to number
    size = Number(size); // Convert to number

    try {
      const totalCount = await this.sharedUpload.countDocuments();
      const totalPages = Math.ceil(totalCount / size);

      const aggregatedData = await this.sharedUpload.aggregate([
        { $skip: (page - 1) * size },
        { $limit: size },
        {
          $lookup: {
            from: 'uploads', // Assuming the name of the Uploads collection
            localField: 'image',
            foreignField: '_id',
            as: 'image',
          },
        },
        { $unwind: '$image' },
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
            'image.bestVotesLength': { $size: '$image.bestVotes' },
            'image.interactedVotesLength': { $size: '$image.InteractedVotes' },
          },
        },
        {
          $project: {
            _id: 1,
            imageUrl: '$image.imageUrl',
            ageType: '$image.ageType',
            gender: '$image.gender',
            user: '$user._id',
            bestVotesLength: { $size: '$image.bestVotes' },
            interactedVotesLength: { $size: '$image.InteractedVotes' },
            count: 1,
          },
        },
      ]);
      
      return {
        page: page,
        size: size,
        totalPages: totalPages,
        totalCount: totalCount,
        data: aggregatedData,
      };
    } catch (error) {
      console.log(error);
      throw new Error('Unable to fetch shared uploads');
    }
  }

  // create shared upload
  async createAndUpdateSharedUpload(uploadId, userId) {
    try {
      // check if image have shared upload before
      const imageSharedUpload = await this.sharedUpload.findOne({
        image: uploadId,
      });
      if (imageSharedUpload) {
        imageSharedUpload.count = imageSharedUpload.count + 1;
        await imageSharedUpload.save();
        return imageSharedUpload;
      } else {
        const newSharedUpload = await this.sharedUpload.create({
          image: uploadId,
          count: 1,
          user: userId,
        });
        return newSharedUpload;
      }
    } catch (error) {
      throw new Error('Unable to create shared upload');
    }
  }

  // update shared upload
  // async updateSharedUpload(uploadId) {
  //   try {
  //     const sharedUpload = await this.sharedUpload.findById(uploadId);
  //     if (!sharedUpload) {
  //       throw new Error('Shared upload not found');
  //     }
  //     sharedUpload.count = sharedUpload.count + 1;
  //     await sharedUpload.save();
  //     return sharedUpload;
  //   } catch (error) {
  //     console.log(error)
  //     throw new Error('Unable to update shared upload');
  //   }
  // }
}

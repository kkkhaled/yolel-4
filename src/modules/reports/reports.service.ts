import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Upload } from 'src/schema/uploadSchema';
import { Vote } from 'src/schema/voteSchema';
import { SharedUploads } from 'src/schema/sharedUpload.schema';
import { Report } from 'src/schema/reports';
import { User } from 'src/schema/userSchema';
import { populate } from 'dotenv';

@Injectable()
export class ReportService {
  constructor(
    @InjectModel(Report.name) private readonly reportModel: Model<Report>,
    @InjectModel(Upload.name) private uploadModel: Model<Upload>,
    @InjectModel(Vote.name) private voteModel: Model<Upload>,
    @InjectModel(SharedUploads.name) private sharedUpload: Model<SharedUploads>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async createReport(id: string, userId: string) {
    const report = new this.reportModel({
      upload: id,
      user: userId,
    });
    return await report.save();
  }
  // for admin
  async getReports(page = 1, size = 10) {
    // Calculate the offset based on the page number and size
    const offset = (page - 1) * size;

    // Query the database for a page of reports
    const reports = await this.reportModel
      .find()
      .populate({
        path: 'upload',
        select: 'imageUrl ageType gender user',
      })
      .populate({
        path: 'user',
        select: 'name email',
      })
      .skip(offset)
      .limit(size);

    // Count the total number of documents in the collection
    const totalCount = await this.reportModel.countDocuments();

    // Calculate the total number of pages
    const totalPages = Math.ceil(totalCount / size);

    // Return an object containing paginated results and metadata
    return {
      page: page,
      size: size,
      totalPages: totalPages,
      totalCount: totalCount,
      data: reports,
    };
  }
  async deleteReport(reportId: string): Promise<void> {
    await this.reportModel.findByIdAndDelete(reportId);
  }

  async rmoveWithAssociatedVotesAndUplaods(reportId: string) {
    try {
      const report = await this.reportModel
        .findById(reportId)
        .populate('upload')
        .exec();

      if (!report) {
        throw new Error('Report not found');
      }

      // Retrieve the associated upload ID from the report
      const uploadId = report.upload._id;

      // Delete all votes associated with the upload ID
      await this.voteModel.deleteMany({
        $or: [{ imageOne: uploadId }, { imageTwo: uploadId }],
      });

      // Delete the upload document
      await this.uploadModel.findByIdAndDelete(uploadId);

      // Delete the report itself
      await this.reportModel.findByIdAndDelete(reportId);

      await this.reportModel.deleteMany({
        upload: uploadId,
      });

      // Delete its shared uploads
      await this.sharedUpload.deleteMany({
        image: uploadId,
      });
      return {
        message: 'deleted successfully',
      };
    } catch (error) {
      throw new Error(`cannot remove report: ${error.message}`);
    }
  }
}

import {
  Controller,
  Get,
  Req,
  Post,
  UseGuards,
  Query,
  Body,
  Put,
  Param,
} from '@nestjs/common';
import { VotesService } from './vote.service';
import { Request } from 'express';
import { JwtAuthGuard } from 'src/shared/jwt-auth-guard';
import { User } from 'src/auth/types/User';
import { UserRoleGuard } from 'src/middleware/userRole.guard';
import { Roles } from 'src/decorators/role.decorator';
import { GetUserVotesQueryDto } from './dto/user-vote-query.dto';

@Controller('vote')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Get('getAll')
  @UseGuards(JwtAuthGuard)
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('user', 'admin')
  async getAllVotes(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
    @Req() req: Request,

    @Query('gender') gender?: string,
    @Query('ageType') ageType?: string,
  ) {
    const filterGender = gender ? gender : null;
    const filterAgeType = ageType ? ageType : null;
    const user = req.user as User;
    return await this.votesService.getAllVotes(
      user.id,
      page,
      pageSize,
      filterGender,
      filterAgeType,
      user.userPoints,
    );
  }

  @Get('admin/vote-list')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('admin')
  async getVotesForAdmin(
    @Query('page') page: number,
    @Query('pageSize') pageSize: number,
  ) {
    return await this.votesService.getVotesForAdmin(page, pageSize);
  }

  // find vote by id
  @Get(':id')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('user')
  async getVote(@Param('id') id: string) {
    return await this.votesService.getVote(id);
  }

  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Put('update/:voteId')
  @Roles('user')
  async updateVote(
    @Param('voteId') voteId: string,
    @Body('choiceImage') choiceImage: string,
    @Req() req: Request,
  ) {
    const user = req.user as User;
    return this.votesService.updateVote(choiceImage, voteId, user.id);
  }

  @Post('update-votes')
  async runMigration() {
    return await this.votesService.updateVotesWithGenderAndAgeType();
  }

  @Get('user')
  @UseGuards(JwtAuthGuard, UserRoleGuard)
  @Roles('user')
  async getVotesForUser(@Query() query: GetUserVotesQueryDto, @Req() req) {
    return this.votesService.findByUserVotesSortedByOwnUploadId({
      userId: req.user.id,
      page: query.page,
      limit: query.limit,
      sortOrder: query.sortOrder,
    });
  }
}

import { Controller, Get, Post, Param, Patch, Body, UseGuards, Put, Query } from '@nestjs/common';
import { SharedVotesService } from './shared-votes.service';
import { JwtAuthGuard } from 'src/shared/jwt-auth-guard';

@Controller('shared-votes')
export class SharedVotesController {
  constructor(private readonly sharedVotesService: SharedVotesService) {}

  @Get()
  async getAllSharedVotes(   
 @Query('page') page: number = 1,
  @Query('pageSize') pageSize: number = 10,) {
    return this.sharedVotesService.getAllSharedVotes(page,pageSize);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createSharedVote(@Body('voteId') voteId: string) {
    return this.sharedVotesService.createSharedVote(voteId);
  }

  @Put(':id/increase')
  @UseGuards(JwtAuthGuard)
  async increaseCount(@Param('id') id: string) {
    return this.sharedVotesService.updateSharedVoteCount(id);
  }
}

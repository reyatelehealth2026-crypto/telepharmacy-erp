import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { QueryContentDto } from './dto/query-content.dto';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  findAll(@Query() query: QueryContentDto) {
    return this.contentService.findAll({
      type: query.type,
      tags: query.tags,
      q: query.q,
      page: query.page ? parseInt(query.page, 10) : 1,
      limit: query.limit ? parseInt(query.limit, 10) : 20,
      publishedOnly: true,
    });
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.contentService.findBySlug(slug);
  }

  @Post(':id/view')
  incrementView(@Param('id', ParseUUIDPipe) id: string) {
    return this.contentService.incrementViewCount(id);
  }
}

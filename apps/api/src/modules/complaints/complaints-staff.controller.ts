import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ComplaintsService } from './complaints.service';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';
import { QueryComplaintsDto } from './dto/query-complaints.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('staff/complaints')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'pharmacist', 'customer_service')
export class ComplaintsStaffController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Get()
  findAll(@Query() query: QueryComplaintsDto) {
    return this.complaintsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.complaintsService.findOne(id);
  }

  @Patch(':id/resolve')
  resolve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveComplaintDto,
    @CurrentUser() user: any,
  ) {
    return this.complaintsService.resolve(id, dto, user.id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: string,
  ) {
    return this.complaintsService.updateStatus(id, status);
  }
}

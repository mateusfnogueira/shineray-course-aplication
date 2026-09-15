import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { StoresService } from './stores.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { UpdateStoreStatusDto } from './dto/update-store-status.dto';
import { ListStoresQueryDto } from './dto/list-stores-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@compliance/shared';
import type { JwtPayload } from '@compliance/shared';

@ApiTags('stores')
@ApiBearerAuth('access-token')
@Roles(UserRole.MASTER_ADMIN)
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @ApiOperation({ summary: 'List all stores (paginated)' })
  findAll(@Query() query: ListStoresQueryDto): ReturnType<StoresService['findAll']> {
    return this.storesService.findAll(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new store' })
  create(
    @Body() dto: CreateStoreDto,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StoresService['create']> {
    return this.storesService.create(dto, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store details' })
  findOne(@Param('id', ParseUUIDPipe) id: string): ReturnType<StoresService['findOne']> {
    return this.storesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update store' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreDto,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StoresService['update']> {
    return this.storesService.update(id, dto, user.sub);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activate or deactivate a store' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreStatusDto,
    @CurrentUser() user: JwtPayload,
  ): ReturnType<StoresService['updateStatus']> {
    return this.storesService.updateStatus(id, dto.active, user.sub);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'List users of a store' })
  findUsers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListStoresQueryDto,
  ): ReturnType<StoresService['findStoreUsers']> {
    return this.storesService.findStoreUsers(id, query);
  }

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Get store metrics' })
  findMetrics(@Param('id', ParseUUIDPipe) id: string): ReturnType<StoresService['findStoreMetrics']> {
    return this.storesService.findStoreMetrics(id);
  }
}

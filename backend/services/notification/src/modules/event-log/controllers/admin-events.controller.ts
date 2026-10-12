import { UserRole } from '@bazaar/contracts';
import { ApiZodQuery, ApiZodResponse, Roles, ZodValidationPipe } from '@bazaar/nest-common';
import { Controller, Get, HttpStatus, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  eventLogPageSchema,
  type EventLogPageResponse,
  type SearchEventsQuery,
  searchEventsQuerySchema,
} from '../dto/event-log.dto.js';
import { EventLogRepository } from '../repositories/event-log.repository.js';

/** Every business event the platform produced, for admins (plan F12). */
@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.Admin)
@Controller('admin/events')
export class AdminEventsController {
  public constructor(private readonly log: EventLogRepository) {}

  @Get()
  @ApiZodQuery(searchEventsQuerySchema)
  @ApiZodResponse(HttpStatus.OK, eventLogPageSchema)
  public async search(
    @Query(new ZodValidationPipe(searchEventsQuerySchema)) query: SearchEventsQuery,
  ): Promise<EventLogPageResponse> {
    const { items, total } = await this.log.search(query);
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: items.map((entry) => ({ ...entry, occurredAt: entry.occurredAt.toISOString() })),
    };
  }
}

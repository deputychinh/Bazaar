import {
  ApiZodQuery,
  ApiZodResponse,
  type AuthenticatedUser,
  Clock,
  CurrentUser,
  NotFoundError,
  ZodValidationPipe,
} from '@bazaar/nest-common';
import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import {
  type ListNotificationsQuery,
  listNotificationsQuerySchema,
  notificationPageSchema,
  type NotificationPageResponse,
} from '../dto/notifications.dto.js';
import { NotificationsRepository } from '../repositories/notifications.repository.js';

/** The signed-in user's in-app notifications (bell in the header). */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  public constructor(
    private readonly notifications: NotificationsRepository,
    private readonly clock: Clock,
  ) {}

  @Get()
  @ApiZodQuery(listNotificationsQuerySchema)
  @ApiZodResponse(HttpStatus.OK, notificationPageSchema)
  public async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listNotificationsQuerySchema)) query: ListNotificationsQuery,
  ): Promise<NotificationPageResponse> {
    const page = await this.notifications.page(user.id, query);
    return {
      ...query,
      total: page.total,
      unread: page.unread,
      items: page.items.map((item) => ({
        id: item.id,
        kind: item.kind,
        data: item.data,
        readAt: item.readAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
    };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  public markAllRead(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    return this.notifications.markAllRead(user.id, this.clock.now());
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    if (!(await this.notifications.markRead(user.id, id, this.clock.now()))) {
      throw new NotFoundError('Notification', id);
    }
  }
}

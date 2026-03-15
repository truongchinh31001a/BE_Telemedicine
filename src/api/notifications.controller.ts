import { Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('me')
  getMyNotifications(@Req() req: any) {
    return this.notificationsService.getMyNotifications(req.user.sub);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Get('me/unread-count')
  getUnreadCount(@Req() req: any) {
    return this.notificationsService.getUnreadCount(req.user.sub);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Patch(':notificationId/read')
  markAsRead(@Req() req: any, @Param('notificationId') notificationId: string) {
    return this.notificationsService.markAsRead(req.user.sub, notificationId);
  }

  @Roles('admin', 'doctor', 'nurse', 'patient')
  @Patch('me/read-all')
  markAllAsRead(@Req() req: any) {
    return this.notificationsService.markAllAsRead(req.user.sub);
  }
}

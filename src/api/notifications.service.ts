import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { idText, optionalObjectId, requireObjectId } from './common/alias.util';

type CreateNotificationPayload = {
  userId: string;
  title: string;
  message: string;
  type?: string;
  refType?: string;
  refId?: string | null;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel('Notification') private readonly notificationModel: Model<any>,
  ) {}

  async create(payload: CreateNotificationPayload) {
    const created = await this.notificationModel.create({
      user_id: requireObjectId(payload.userId, 'userId'),
      title: payload.title,
      message: payload.message,
      type: payload.type ?? 'system',
      ref_type: payload.refType,
      ref_id: optionalObjectId(payload.refId),
      metadata: payload.metadata ?? {},
      is_read: false,
      read_at: null,
    });

    return this.toResponse(created);
  }

  async getMyNotifications(userId: string) {
    const items = await this.notificationModel
      .find({ user_id: requireObjectId(userId, 'userId') })
      .sort({ created_at: -1 })
      .lean();

    return items.map((item: any) => this.toResponse(item));
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await this.notificationModel.countDocuments({
      user_id: requireObjectId(userId, 'userId'),
      is_read: false,
    });

    return { unreadCount };
  }

  async markAsRead(userId: string, notificationId: string) {
    const updated = await this.notificationModel.findOneAndUpdate(
      {
        _id: requireObjectId(notificationId, 'notificationId'),
        user_id: requireObjectId(userId, 'userId'),
      },
      {
        $set: {
          is_read: true,
          read_at: new Date(),
        },
      },
      { returnDocument: 'after' },
    );

    if (!updated) throw new NotFoundException('Notification not found');
    return this.toResponse(updated);
  }

  async markAllAsRead(userId: string) {
    const result = await this.notificationModel.updateMany(
      { user_id: requireObjectId(userId, 'userId'), is_read: false },
      {
        $set: {
          is_read: true,
          read_at: new Date(),
        },
      },
    );

    return {
      success: true,
      updatedCount: result.modifiedCount ?? 0,
    };
  }

  private toResponse(item: any) {
    return {
      notificationId: idText(item),
      userId: String(item.user_id),
      title: item.title,
      message: item.message,
      type: item.type ?? 'system',
      refType: item.ref_type ?? null,
      refId: item.ref_id ? String(item.ref_id) : null,
      isRead: Boolean(item.is_read),
      readAt: item.read_at ?? null,
      metadata: item.metadata ?? {},
      createdAt: item.created_at ?? null,
    };
  }
}

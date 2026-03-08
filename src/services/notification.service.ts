import { admin } from '../config/firebase.js';
import User from '../models/User.js';
import { ICareTask } from '../models/CareTask.js';
import { IPlantBatch } from '../models/PlantBatch.js';
import { ICareSchedule } from '../models/CareSchedule.js';
import { Message, Messaging } from 'firebase-admin/messaging';

const isFirebaseReady = (): boolean => {
  try {
    return admin.apps && admin.apps.length > 0;
  } catch {
    return false;
  }
};

const sendToTokens = async (tokens: string[], message: any): Promise<number> => {
  if (!isFirebaseReady() || tokens.length === 0) return 0;

  const messaging = admin.messaging();
  let successCount = 0;
  const invalidTokens: string[] = [];

  const results = await Promise.allSettled(
    tokens.map((token) =>
      messaging.send({ ...message, token }),
    ),
  );

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      successCount += 1;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorCode = (result.reason as any)?.code;
      if (
        errorCode === 'messaging/invalid-registration-token' ||
        errorCode === 'messaging/registration-token-not-registered'
      ) {
        invalidTokens.push(tokens[i]);
      }
    }
  });

  if (invalidTokens.length > 0) {
    await cleanupInvalidTokens(invalidTokens);
  }

  return successCount;
};

const cleanupInvalidTokens = async (invalidTokens: string[]) => {
  try {
    await User.updateMany(
      { 'fcmTokens.token': { $in: invalidTokens } },
      { $pull: { fcmTokens: { token: { $in: invalidTokens } } } },
    );
  } catch (error: any) {
    console.error('FCM token cleanup failed:', error.message);
  }
};

export const getTokensForUsers = async (userIds: string[]): Promise<string[]> => {
  if (!userIds || userIds.length === 0) return [];

  const users = await User.find({
    _id: { $in: userIds },
    isActive: true,
  }).select('fcmTokens');

  return users.flatMap((u) => u.fcmTokens.map((t) => t.token));
};

export const sendTaskDueNotification = async (task: ICareTask, batch: IPlantBatch, fcmTokens: string[]) => {
  if (!isFirebaseReady() || fcmTokens.length === 0) return 0;

  const careLabel = task.careType.charAt(0).toUpperCase() + task.careType.slice(1);
  const locationInfo = [batch.zone && `Zone ${batch.zone}`, batch.location]
    .filter(Boolean)
    .join(', ');

  const message = {
    notification: {
      title: `${careLabel} Due — ${batch.name}`,
      body: locationInfo
        ? `${locationInfo} — ${task.notes || 'Check schedule for details'}`
        : task.notes || 'A care task is due now',
    },
    data: {
      type: 'task_due',
      taskId: task._id.toString(),
      batchId: task.batchId.toString(),
      careType: task.careType,
    },
  };

  return sendToTokens(fcmTokens, message);
};

export const sendTaskReminderNotification = async (task: ICareTask, batch: IPlantBatch, fcmTokens: string[]) => {
  if (!isFirebaseReady() || fcmTokens.length === 0) return 0;

  const careLabel = task.careType.charAt(0).toUpperCase() + task.careType.slice(1);
  const locationInfo = [batch.zone && `Zone ${batch.zone}`, batch.location]
    .filter(Boolean)
    .join(', ');

  const message = {
    notification: {
      title: `Reminder: ${careLabel} in 15 min — ${batch.name}`,
      body: locationInfo
        ? `${locationInfo} — ${task.notes || 'Get ready for upcoming task'}`
        : task.notes || 'A care task is coming up soon',
    },
    data: {
      type: 'task_reminder',
      taskId: task._id.toString(),
      batchId: task.batchId.toString(),
      careType: task.careType,
    },
  };

  return sendToTokens(fcmTokens, message);
};

export const sendScheduleUpdateNotification = async (schedule: ICareSchedule, action: 'created' | 'updated' | 'deactivated', fcmTokens: string[]) => {
  if (!isFirebaseReady() || fcmTokens.length === 0) return 0;

  const message = {
    data: {
      type: 'schedule_updated',
      scheduleId: schedule._id.toString(),
      action,
    },
  };

  return sendToTokens(fcmTokens, message);
};

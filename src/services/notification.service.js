import { admin } from '../config/firebase.js';
import User from '../models/User.js';

/**
 * Check if Firebase messaging is available.
 * @returns {boolean}
 */
const isFirebaseReady = () => {
  try {
    return admin.apps && admin.apps.length > 0;
  } catch {
    return false;
  }
};

/**
 * Send FCM push to multiple tokens, cleaning up invalid ones.
 * @param {string[]} tokens - FCM registration tokens
 * @param {Object} message - { notification, data }
 * @returns {Promise<number>} Number of successful sends
 */
const sendToTokens = async (tokens, message) => {
  if (!isFirebaseReady() || tokens.length === 0) return 0;

  const messaging = admin.messaging();
  let successCount = 0;
  const invalidTokens = [];

  // Send individually to track per-token failures
  const results = await Promise.allSettled(
    tokens.map((token) =>
      messaging.send({ ...message, token }),
    ),
  );

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      successCount += 1;
    } else {
      const errorCode = result.reason?.code;
      if (
        errorCode === 'messaging/invalid-registration-token' ||
        errorCode === 'messaging/registration-token-not-registered'
      ) {
        invalidTokens.push(tokens[i]);
      }
    }
  });

  // Clean up invalid tokens
  if (invalidTokens.length > 0) {
    await cleanupInvalidTokens(invalidTokens);
  }

  return successCount;
};

/**
 * Remove invalid FCM tokens from all users.
 * @param {string[]} invalidTokens
 */
const cleanupInvalidTokens = async (invalidTokens) => {
  try {
    await User.updateMany(
      { 'fcmTokens.token': { $in: invalidTokens } },
      { $pull: { fcmTokens: { token: { $in: invalidTokens } } } },
    );
  } catch (error) {
    console.error('FCM token cleanup failed:', error.message);
  }
};

/**
 * Get FCM tokens for a list of user IDs.
 * @param {string[]} userIds
 * @returns {Promise<string[]>}
 */
export const getTokensForUsers = async (userIds) => {
  if (!userIds || userIds.length === 0) return [];

  const users = await User.find({
    _id: { $in: userIds },
    isActive: true,
  }).select('fcmTokens');

  return users.flatMap((u) => u.fcmTokens.map((t) => t.token));
};

/**
 * Send task-due push notification.
 * @param {Object} task - CareTask document
 * @param {Object} batch - PlantBatch document
 * @param {string[]} fcmTokens
 * @returns {Promise<number>}
 */
export const sendTaskDueNotification = async (task, batch, fcmTokens) => {
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

/**
 * Send schedule-updated push notification.
 * @param {Object} schedule - CareSchedule document
 * @param {string} action - 'created' | 'updated' | 'deactivated'
 * @param {string[]} fcmTokens
 * @returns {Promise<number>}
 */
export const sendScheduleUpdateNotification = async (schedule, action, fcmTokens) => {
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

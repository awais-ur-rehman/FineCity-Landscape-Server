import CareTask from '../models/CareTask.js';
import PlantBatch from '../models/PlantBatch.js';
import CareSchedule from '../models/CareSchedule.js';
import User from '../models/User.js';
import apiResponse from '../utils/apiResponse.js';

/**
 * POST /sync
 * Process offline completions and return data updated since lastSyncAt.
 */
export const sync = async (req, res, next) => {
  try {
    const { lastSyncAt, completedTasks } = req.body;
    const userId = req.user._id;
    const syncedAt = new Date();

    // 1. Process offline completions
    const completionResults = [];
    for (const { taskId, completedAt, notes } of completedTasks) {
      const task = await CareTask.findById(taskId);

      if (!task) {
        completionResults.push({ taskId, status: 'not_found' });
        continue;
      }

      // Skip if already completed or missed — server wins
      if (task.status === 'completed' || task.status === 'missed') {
        completionResults.push({ taskId, status: 'already_' + task.status });
        continue;
      }

      task.status = 'completed';
      task.completedBy = userId;
      task.completedAt = completedAt || syncedAt;
      if (notes) task.notes = notes;
      await task.save();

      completionResults.push({ taskId, status: 'completed' });
    }

    // 2. Query tasks updated since lastSyncAt for this employee
    const sinceDate = new Date(lastSyncAt);
    const tasks = await CareTask.find({
      assignedTo: userId,
      updatedAt: { $gte: sinceDate },
    })
      .populate('batchId', 'name plantType zone location imageUrl')
      .populate('scheduleId', 'careType scheduledTime instructions')
      .sort({ scheduledAt: 1 });

    // 3. Collect unique batchIds from those tasks and fetch batches
    const batchIds = [...new Set(tasks.map((t) => t.batchId?._id?.toString()).filter(Boolean))];
    const batches = batchIds.length > 0
      ? await PlantBatch.find({ _id: { $in: batchIds }, isDeleted: false })
      : [];

    // 4. Active schedules assigned to this employee
    const schedules = await CareSchedule.find({
      $or: [
        { assignedTo: userId },
        { assignedTo: { $size: 0 } },
      ],
      isActive: true,
      updatedAt: { $gte: sinceDate },
    })
      .populate('batchId', 'name plantType zone location');

    // 5. Update user.lastSyncAt
    await User.findByIdAndUpdate(userId, { lastSyncAt: syncedAt });

    return apiResponse(res, 200, 'Sync completed successfully', {
      tasks,
      batches,
      schedules,
      completionResults,
      syncedAt,
    });
  } catch (error) {
    next(error);
  }
};

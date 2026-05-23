import PlantBatch from '../models/PlantBatch.js';
import PlantType from '../models/PlantType.js';
import Zone from '../models/Zone.js';
import ApiError from '../utils/apiError.js';

interface ListBatchesQuery {
  branchId?: string;
  zone?: string;
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const listBatches = async ({ branchId, zone, category, status, search, page = 1, limit = 20 }: ListBatchesQuery) => {
  const filter: Record<string, unknown> = { isDeleted: false };

  if (branchId) filter.branchId = branchId;
  if (zone) filter.zone = zone;
  if (category) filter.category = category;
  if (status) filter.status = status;

  if (search) {
    const matchingTypeIds = await PlantType.find({ name: { $regex: search, $options: 'i' } }).select('_id').lean();
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { scientificName: { $regex: search, $options: 'i' } },
      ...(matchingTypeIds.length ? [{ plantType: { $in: matchingTypeIds.map((t) => t._id) } }] : []),
    ] as unknown as Record<string, unknown>[];
  }

  const skip = (page - 1) * limit;

  const [batches, total] = await Promise.all([
    PlantBatch.find(filter)
      .populate('createdBy', 'name email')
      .populate('zone', 'name code')
      .populate('category', 'name slug')
      .populate('plantType', 'name scientificName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }),
    PlantBatch.countDocuments(filter),
  ]);

  return {
    batches,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getBatchById = async (id: string) => {
  const batch = await PlantBatch.findOne({ _id: id, isDeleted: false })
    .populate('createdBy', 'name email')
    .populate('zone', 'name code')
    .populate('category', 'name slug')
    .populate('plantType', 'name scientificName');

  if (!batch) {
    throw ApiError.notFound('Plant batch not found');
  }

  return batch;
};

interface BatchPayload {
  name: string;
  plantType: string;
  scientificName?: string;
  category: string;
  quantity?: number;
  zone: string;
  location?: string;
  imageUrl?: string;
  notes?: string;
  branchId: string;
  [key: string]: unknown;
}

const buildDisplayName = async (name: string, zoneId: string): Promise<string> => {
  const zone = await Zone.findById(zoneId).select('name code').lean();
  return zone ? `${name} — ${zone.name}` : name;
};

export const createBatch = async (data: BatchPayload, userId: string) => {
  const displayName = await buildDisplayName(data.name, data.zone);

  const batch = await PlantBatch.create({
    ...data,
    displayName,
    createdBy: userId,
  });

  return getBatchById(batch._id.toString());
};

export const updateBatch = async (id: string, updates: Partial<BatchPayload>, userId: string) => {
  const existing = await PlantBatch.findOne({ _id: id, isDeleted: false });
  if (!existing) throw ApiError.notFound('Plant batch not found');

  const nameChanged = updates.name && updates.name !== existing.name;
  const zoneChanged = updates.zone && updates.zone !== existing.zone.toString();

  if (nameChanged || zoneChanged) {
    const name = updates.name ?? existing.name;
    const zoneId = updates.zone ?? existing.zone.toString();
    updates.displayName = await buildDisplayName(name, zoneId);
  }

  const batch = await PlantBatch.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { ...updates, updatedBy: userId },
    { returnDocument: 'after', runValidators: true },
  )
    .populate('createdBy', 'name email')
    .populate('zone', 'name code')
    .populate('category', 'name slug')
    .populate('plantType', 'name scientificName');

  if (!batch) throw ApiError.notFound('Plant batch not found');

  return batch;
};

export const deleteBatch = async (id: string) => {
  const batch = await PlantBatch.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { isDeleted: true },
    { returnDocument: 'after' },
  );

  if (!batch) {
    throw ApiError.notFound('Plant batch not found');
  }
};

export const exportBatchesCsv = async (branchId?: string): Promise<string> => {
  const filter: Record<string, unknown> = { isDeleted: false };
  if (branchId) filter.branchId = branchId;

  const batches = await PlantBatch.find(filter)
    .populate('zone', 'name code')
    .populate('category', 'name')
    .populate('plantType', 'name')
    .lean();

  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const headers = ['Name', 'Plant Type', 'Scientific Name', 'Category', 'Quantity', 'Zone', 'Location', 'Status', 'Notes'];
  const rows = batches.map((b) => [
    b.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (b.plantType as any)?.name ?? b.plantType ?? '',
    b.scientificName ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (b.category as any)?.name ?? b.category ?? '',
    b.quantity ?? '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (b.zone as any)?.name ?? b.zone ?? '',
    b.location ?? '',
    b.status,
    b.notes ?? '',
  ].map(escape).join(','));

  return [headers.join(','), ...rows].join('\r\n');
};

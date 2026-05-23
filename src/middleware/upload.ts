import multer from 'multer';
import { cloudinary, isConfigured } from '../config/cloudinary.js';
import ApiError from '../utils/apiError.js';

/** Max 3 photos, 5 MB each */
const MAX_FILES = 3;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(ApiError.badRequest('Only image files are allowed'));
    return;
  }
  cb(null, true);
};

/** Multer middleware — parses multipart/form-data, holds files in memory. */
export const taskPhotoUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES, files: MAX_FILES },
}).array('photos', MAX_FILES);

/** Single image upload for plant batch / general use */
export const singleImageUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_BYTES, files: 1 },
}).single('image');

/**
 * Upload buffers to Cloudinary under the `care-tasks/<taskId>/` folder.
 * Returns an array of secure URLs.
 * No-op (returns []) when Cloudinary is not configured.
 */
export const uploadPhotosToCloudinary = async (
  files: Express.Multer.File[],
  taskId: string,
): Promise<string[]> => {
  if (!isConfigured || files.length === 0) return [];

  const uploads = files.map(
    (file) =>
      new Promise<string>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `care-tasks/${taskId}`,
            resource_type: 'image',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }],
          },
          (error, result) => {
            if (error || !result) return reject(error ?? new Error('Upload failed'));
            resolve(result.secure_url);
          },
        );
        stream.end(file.buffer);
      }),
  );

  return Promise.all(uploads);
};

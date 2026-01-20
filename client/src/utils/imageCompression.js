import imageCompression from 'browser-image-compression';

const MB = 1024 * 1024;

export const MAX_UPLOAD_MB = 8;
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * MB;

const toFile = (blob, sourceFile) => {
  if (blob instanceof File) return blob;
  const name = sourceFile?.name || 'image';
  const type = blob?.type || sourceFile?.type || 'image/jpeg';
  return new File([blob], name, {
    type,
    lastModified: Date.now(),
  });
};

export const ensureImageUnderBytes = async (
  file,
  {
    maxBytes = MAX_UPLOAD_BYTES,
    maxWidthOrHeight = 4096,
    initialQuality = 0.92,
  } = {}
) => {
  if (!file) throw new Error('No file provided');

  // If already under budget, keep original bytes.
  if (typeof file.size === 'number' && file.size <= maxBytes) return file;

  // browser-image-compression expects a File/Blob.
  const source = file;

  const supportedOutTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
  const outType = supportedOutTypes.has(source?.type) ? source.type : 'image/jpeg';

  const targetMb = Math.max(0.1, maxBytes / MB);
  const optionsBase = {
    maxWidthOrHeight,
    useWebWorker: true,
    initialQuality,
    fileType: outType,
  };

  // Retry with slightly smaller targets if needed.
  const targets = [
    targetMb,
    targetMb * 0.95,
    targetMb * 0.9,
    targetMb * 0.85,
    targetMb * 0.8,
    targetMb * 0.75,
  ];

  let lastError = null;

  for (const maxSizeMB of targets) {
    try {
      const compressedBlob = await imageCompression(source, {
        ...optionsBase,
        maxSizeMB,
      });

      const outFile = toFile(compressedBlob, source);
      if (outFile.size <= maxBytes) return outFile;
    } catch (e) {
      lastError = e;
    }
  }

  const originalMb = typeof source.size === 'number' ? (source.size / MB).toFixed(2) : 'unknown';
  const message =
    `Image is larger than ${MAX_UPLOAD_MB}MB (${originalMb}MB) and could not be compressed enough for upload.`;

  const err = new Error(message);
  err.cause = lastError;
  throw err;
};

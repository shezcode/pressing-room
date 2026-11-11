const fs = require("fs");
const path = require("path");
const multer = require("multer");
const config = require("./config");

const coversDir = path.join(__dirname, "../uploads/covers");

const MAX_COVER_BYTES = 5 * 1024 * 1024;

// Identify an image by its first bytes, since the client-declared type can be anything.
// Returns the file extension, or null when the bytes are not an accepted image.
const sniffExtension = (buffer) => {
  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) {
    return "jpg";
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
};

// Keep the upload in memory until the other fields have been validated,
// so a rejected request leaves nothing on disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_COVER_BYTES, files: 1 },
});

// Middleware: parse a multipart body with an optional `cover` file.
// Upload problems answer 400 with the same shape as field validation errors.
// The Demo refuses any uploaded file, so nobody can host images on it.
exports.parseCover = (req, res, next) => {
  upload.single("cover")(req, res, (error) => {
    if (!error && req.file && config.demo) {
      return res.status(403).json({ message: "Cover upload is disabled in the demo" });
    }
    if (!error) {
      return next();
    }

    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? `Cover image must be at most ${MAX_COVER_BYTES / 1024 / 1024} MB`
        : "Could not read the cover image upload";
    res.status(400).json({ message: "Validation failed", errors: { cover: message } });
  });
};

// Check an uploaded cover. Returns a message when it is missing or not an accepted image.
exports.coverError = (file, { required }) => {
  if (!file) {
    return required ? "Cover image is required" : null;
  }
  return sniffExtension(file.buffer)
    ? null
    : "Cover image must be a JPEG, PNG or WebP file";
};

// The covers already in the uploads folder, as URL paths like a Record's coverUrl
exports.listCovers = () =>
  fs
    .readdirSync(coversDir)
    .filter((name) => /\.(jpe?g|png|webp)$/i.test(name))
    .sort()
    .map((name) => `/uploads/covers/${name}`);

// Check a cover picked by URL on the Demo. Only the listed covers count, which also rules out paths elsewhere.
exports.existingCoverError = (coverUrl, { required }) => {
  if (!coverUrl) {
    return required ? "Pick one of the existing covers" : null;
  }
  return exports.listCovers().includes(coverUrl) ? null : "Cover must be one of the existing covers";
};

// Write a checked cover into the uploads folder. Returns its URL path, as served statically.
exports.saveCover = (file) => {
  const name = `${crypto.randomUUID()}.${sniffExtension(file.buffer)}`;
  fs.writeFileSync(path.join(coversDir, name), file.buffer);
  return `/uploads/covers/${name}`;
};

// Remove a cover saved moments ago when the Record could not be stored
exports.discardCover = (coverUrl) => {
  try {
    fs.unlinkSync(path.join(coversDir, path.basename(coverUrl)));
  } catch (error) {
    console.error("Error removing cover:", error);
  }
};

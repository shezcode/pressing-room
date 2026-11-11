const { readRecords, writeRecords } = require("../lib/recordsStore");
const { FORMATS, validateRecordFields } = require("../lib/recordValidation");
const config = require("../lib/config");
const {
  coverError,
  existingCoverError,
  saveCover,
  discardCover,
} = require("../lib/coverUpload");

const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

// Parse a positive integer query parameter, or return the fallback when absent
const positiveInt = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }
  return /^[1-9]\d*$/.test(value) ? Number(value) : null;
};

// Lower-case and strip accents so "madrileno" finds "El madrileño"
const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

// Every word of the search term must appear in the artist or the title
const matchesSearch = (record, words) => {
  const haystack = normalize(`${record.artist} ${record.title}`);
  return words.every((word) => haystack.includes(word));
};

// Get a page of Records, newest first, Out of stock ones included.
// `search` (artist and title), `format` and `featured=true` narrow the whole catalog before paging.
exports.getRecords = (req, res) => {
  const page = positiveInt(req.query.page, 1);
  const limit = positiveInt(req.query.limit, DEFAULT_LIMIT);

  if (page === null || limit === null) {
    return res
      .status(400)
      .json({ message: "page and limit must be positive integers" });
  }

  const { search, format, featured } = req.query;

  if (format !== undefined && !FORMATS.includes(format)) {
    return res
      .status(400)
      .json({ message: `format must be one of: ${FORMATS.join(", ")}` });
  }

  if (featured !== undefined && featured !== "true") {
    return res.status(400).json({ message: "featured must be true" });
  }

  const words =
    typeof search === "string" ? normalize(search).split(/\s+/).filter(Boolean) : [];

  const pageSize = Math.min(limit, MAX_LIMIT);
  const records = readRecords()
    .filter((r) => format === undefined || r.format === format)
    .filter((r) => featured === undefined || r.featured)
    .filter((r) => matchesSearch(r, words))
    .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
  const start = (page - 1) * pageSize;

  res.json({
    records: records.slice(start, start + pageSize),
    total: records.length,
    page,
    limit: pageSize,
  });
};

// Get a Record by ID
exports.getRecordById = (req, res) => {
  const record = readRecords().find((r) => r.id === req.params.id);

  if (!record) {
    return res.status(404).json({ message: "Record not found" });
  }

  res.json(record);
};

// Create a Record from a multipart body with a `cover` image (Admin only).
// Every field is validated first; nothing is stored unless all of them pass.
// On the Demo the body names an existing cover in `coverUrl` instead (uploads are refused earlier).
exports.createRecord = (req, res) => {
  const { errors, values } = validateRecordFields(req.body);
  const missingCover = config.demo
    ? existingCoverError(req.body.coverUrl, { required: true })
    : coverError(req.file, { required: true });

  if (missingCover) {
    errors.cover = missingCover;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const coverUrl = config.demo ? req.body.coverUrl : saveCover(req.file);
  const record = {
    id: crypto.randomUUID(),
    ...values,
    coverUrl,
    dateAdded: new Date().toISOString(),
  };

  if (!writeRecords([...readRecords(), record])) {
    if (req.file) {
      discardCover(coverUrl);
    }
    return res.status(500).json({ message: "Could not save the Record" });
  }

  res.status(201).json(record);
};

// Replace a Record's fields from a multipart body (Admin only), validated like creation.
// The `cover` file is optional: without one the Record keeps its current cover.
// On the Demo an optional `coverUrl` switches to another existing cover instead.
// A replaced cover stays on disk, since Order lines keep pointing at it (ADR-0001).
exports.updateRecord = (req, res) => {
  const records = readRecords();
  const existing = records.find((r) => r.id === req.params.id);

  if (!existing) {
    return res.status(404).json({ message: "Record not found" });
  }

  const { errors, values } = validateRecordFields(req.body);
  const badCover = config.demo
    ? existingCoverError(req.body.coverUrl, { required: false })
    : coverError(req.file, { required: false });

  if (badCover) {
    errors.cover = badCover;
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ message: "Validation failed", errors });
  }

  const picked = config.demo && req.body.coverUrl;
  const coverUrl = req.file ? saveCover(req.file) : picked || existing.coverUrl;
  const record = { ...existing, ...values, coverUrl };

  if (!writeRecords(records.map((r) => (r.id === record.id ? record : r)))) {
    if (req.file) {
      discardCover(coverUrl);
    }
    return res.status(500).json({ message: "Could not save the Record" });
  }

  res.json(record);
};

// Remove a Record from the shop (Admin only). Its cover file stays on disk,
// since Order lines and Collections still show it.
exports.deleteRecord = (req, res) => {
  const records = readRecords();

  if (!records.some((r) => r.id === req.params.id)) {
    return res.status(404).json({ message: "Record not found" });
  }

  if (!writeRecords(records.filter((r) => r.id !== req.params.id))) {
    return res.status(500).json({ message: "Could not delete the Record" });
  }

  res.status(204).end();
};

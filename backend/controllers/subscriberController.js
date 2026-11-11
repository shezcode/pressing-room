const {
  readSubscribers,
  writeSubscribers,
} = require("../lib/subscribersStore");

// Keep in step with EMAIL_PATTERN in the frontend's friday-list.component.ts
const EMAIL_PATTERN =/^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign an email up to the Friday List, once per address. Nothing is sent.
exports.subscribe = (req, res) => {
  const { email } = req.body;

  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ message: "A valid email is required" });
  }

  // Emails are compared case-insensitively so the list has no near-duplicates
  const normalizedEmail = email.trim().toLowerCase();
  const subscribers = readSubscribers();

  if (subscribers.some((s) => s.email === normalizedEmail)) {
    return res.status(409).json({
      code: "ALREADY_SUBSCRIBED",
      message: "This email is already on the Friday List",
    });
  }

  const subscriber = {
    email: normalizedEmail,
    dateSubscribed: new Date().toISOString(),
  };

  if (!writeSubscribers([...subscribers, subscriber])) {
    return res.status(500).json({ message: "Could not save the Subscriber" });
  }

  res.status(201).json(subscriber);
};

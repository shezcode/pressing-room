// Keep in step with EMAIL_PATTERN in the backend's subscriberController.js.
// Angular's built-in email validator accepts "a@b", so require a dot in the domain too
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

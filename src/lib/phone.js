export function normalizePhone(phone) {
  const compactPhone = typeof phone === 'string' ? phone.replace(/[\s()-]/g, '') : '';
  if (/^\d{10}$/.test(compactPhone)) return `+91${compactPhone}`;
  return compactPhone;
}

export function isValidPhone(phone) {
  return /^\+[1-9]\d{9,14}$/.test(phone);
}
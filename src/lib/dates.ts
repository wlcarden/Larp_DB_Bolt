import { format } from 'date-fns';

/**
 * Converts a UTC ISO string to a local Date object
 */
export function toLocalTime(utcString: string): Date {
  return new Date(utcString);
}

/**
 * Converts a local Date object to a UTC ISO string
 */
export function toUTCString(localDate: Date): string {
  return localDate.toISOString();
}

/**
 * Formats a date using date-fns format with consistent timezone handling
 */
export function formatDateTime(date: Date, formatStr: string): string {
  return format(date, formatStr);
}

/**
 * Converts an HTML datetime-local input value to a UTC ISO string
 */
export function dateTimeLocalToUTC(localDateTime: string): string {
  const localDate = new Date(localDateTime);
  return toUTCString(localDate);
}

/**
 * Converts a UTC ISO string to a datetime-local input value
 */
export function utcToDateTimeLocal(utcString: string): string {
  const localDate = toLocalTime(utcString);
  return formatDateTime(localDate, "yyyy-MM-dd'T'HH:mm");
}

/**
 * Creates a new Date object in UTC from individual components
 */
export function createUTCDate(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number
): string {
  const localDate = new Date(year, month, day, hours, minutes);
  return toUTCString(localDate);
}

/**
 * Validates if a date string is in UTC ISO format
 */
export function isValidUTCString(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return date.toISOString() === dateString;
  } catch {
    return false;
  }
}
import { addDays, addWeeks, set, isBefore, isAfter, getDay, parseISO } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export type RecurrenceType = 'one_time' | 'daily' | 'weekly' | 'selected_weekdays';

/**
 * Calculates the next valid occurrence for a given schedule based on its configuration.
 *
 * @param startTime ISO string of the schedule's configured `start_time` (used for the time of day)
 * @param timezone IANA timezone string (e.g. 'Asia/Kolkata')
 * @param recurrenceType 'daily', 'weekly', 'selected_weekdays', or 'one_time'
 * @param recurrenceConfig parsed JSON config (e.g. { weekdays: [1, 3, 5] })
 * @param endTime optional ISO string boundary
 * @param referenceTime optional Date representing "now" or "last_run" (defaults to Date.now())
 * @returns Date object of the next run, or null if no valid run exists or it exceeds end_time
 */
export function calculateNextRun(
  startTime: string,
  timezone: string,
  recurrenceType: RecurrenceType,
  recurrenceConfig: any,
  endTime: string | null,
  referenceTime: Date = new Date()
): Date | null {
  if (recurrenceType === 'one_time') {
    const start = new Date(startTime);
    // If it's one_time and we are already past it, we don't return it again unless referenceTime is before it.
    if (isBefore(start, referenceTime)) return null;
    if (endTime && isAfter(start, new Date(endTime))) return null;
    return start;
  }

  // Ensure we are working with the zoned time to preserve local wall-clock hours
  const baseDate = toZonedTime(parseISO(startTime), timezone);
  const targetHour = baseDate.getHours();
  const targetMinute = baseDate.getMinutes();

  // Create a starting point based on referenceTime but in the target timezone
  let candidateZoned = toZonedTime(referenceTime, timezone);
  
  // Set the time of day to match the schedule's start_time
  candidateZoned = set(candidateZoned, { 
    hours: targetHour, 
    minutes: targetMinute, 
    seconds: 0, 
    milliseconds: 0 
  });

  // If this candidate time today has already passed, start checking from tomorrow
  if (isBefore(fromZonedTime(candidateZoned, timezone), referenceTime)) {
    candidateZoned = addDays(candidateZoned, 1);
  }

  // Find the next matching day
  const maxSearchDays = 365; // circuit breaker
  let searchDays = 0;
  
  while (searchDays < maxSearchDays) {
    if (isMatch(candidateZoned, recurrenceType, recurrenceConfig, baseDate)) {
      const nextRunUtc = fromZonedTime(candidateZoned, timezone);
      
      // Check boundaries
      if (endTime && isAfter(nextRunUtc, new Date(endTime))) {
        return null;
      }
      return nextRunUtc;
    }
    candidateZoned = addDays(candidateZoned, 1);
    searchDays++;
  }

  return null;
}

function isMatch(
  dateZoned: Date,
  type: RecurrenceType,
  config: any,
  baseDateZoned: Date
): boolean {
  if (type === 'daily') {
    return true;
  }
  if (type === 'weekly') {
    // Must be same day of week as the original start_time
    return getDay(dateZoned) === getDay(baseDateZoned);
  }
  if (type === 'selected_weekdays') {
    if (!config || !Array.isArray(config.weekdays)) return false;
    const currentDay = getDay(dateZoned);
    return config.weekdays.includes(currentDay);
  }
  return false;
}

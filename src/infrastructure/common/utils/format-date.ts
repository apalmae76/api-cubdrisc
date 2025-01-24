import {
  addHours,
  differenceInSeconds,
  format,
  intervalToDuration,
  isValid,
  parseISO,
} from 'date-fns';

export default function formatDate(date): string {
  return format(date, 'dd/MM/yyyy');
}

export function formatDateTime(date): string {
  return format(date, 'dd/MM/yyyy HH:mm:ss a');
}

export function formatIsoDate(
  date: string | Date,
  onErrorSame = true,
  checkMinYear = false,
): string | Date | null {
  if (!date) {
    return null;
  }
  let newDate = typeof date === 'string' ? parseISO(date) : date;
  if (checkMinYear) {
    newDate = adjustToMinYear(newDate);
  }
  if (isValid(newDate)) {
    return format(newDate, 'yyyy-MM-dd');
  }
  return onErrorSame ? date : null;
}

export function formatDateToIsoString(
  date: string | Date,
  onErrorSame = true,
): string | null {
  if (!date) {
    return null;
  }
  const newDate = typeof date === 'string' ? parseISO(date) : date;
  if (isValid(newDate)) {
    const formatedDate = format(newDate, 'yyyy-MM-dd');
    return formatedDate;
  }
  return onErrorSame ? `${date}`.slice(1, 10) : null;
}

export function formatDateTimeToIsoString(
  date: string | Date,
  onErrorSame = true,
): string | null {
  if (!date) {
    return null;
  }
  const newDate = typeof date === 'string' ? parseISO(date) : date;
  if (isValid(newDate)) {
    const formatedDate = format(newDate, 'yyyy-MM-dd KK:mm:ss');
    return formatedDate;
  }
  return onErrorSame ? `${date}`.slice(1, 10) : null;
}

/**
 * Convert seconds to HH:MM:SS
 * If seconds exceeds 24 hours, hours will be greater than 24 (30:05:10)
 *
 * @param {number} seconds
 * @returns {string}
 */
export function secondsToHms(seconds: number): string {
  if (seconds === 0) {
    return '00:00:00';
  }

  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  const { hours, minutes, seconds: secs } = duration;
  const zeroPad = (num: number) => {
    if (String(num).length > 1) {
      return String(num);
    }
    return String(num).padStart(2, '0');
  };
  // final checks for adjustment of output values
  const fHours = hours && hours > 0 ? zeroPad(hours) : '00';
  const fMinutes = minutes && minutes > 0 ? zeroPad(minutes) : '00';
  const formattedSeconds = secs && secs > 0 ? zeroPad(secs) : '00';
  const result = `${fHours}:${fMinutes}:${formattedSeconds}`;
  return result;
}

/**
 * Return time difference in HH:MM:SS format
 * If seconds exceeds 24 hours, hours will be greater than 24 (30:05:10)
 *
 * @param {string | Date} pastDate
 * @param {number} hoursToAdd
 * @returns {string}
 */
export function timeDifference(
  pastDate,
  hoursToAdd = 0,
  justBiggerTimeUnit = true,
  lang = 'es',
): string {
  pastDate =
    typeof pastDate === 'string' ? parseISO(pastDate) : new Date(pastDate);
  if (!isValid(pastDate)) {
    return '00:00:00';
  }
  const now = new Date();
  let ref = pastDate;
  if (hoursToAdd > 0) {
    ref = addHours(pastDate, hoursToAdd);
  }
  const diffInSeconds = differenceInSeconds(ref, now);
  let result = secondsToHms(diffInSeconds);
  if (justBiggerTimeUnit) {
    const [hours, minutes, seconds] = result
      .split(':')
      .map((value) => parseInt(value));
    //* console.log(`${result}-> ${hours}-${minutes}-${seconds}--->lang=${lang}-`);
    if (hours > 0) {
      result =
        hours === 1
          ? `1 ${lang === 'es' ? 'hora' : 'hour'}`
          : `${hours} ${lang === 'es' ? 'horas' : 'hours'}`;
    } else if (minutes > 0) {
      result =
        minutes === 1
          ? `1 ${lang === 'es' ? 'minuto' : 'minute'}`
          : `${minutes} ${lang === 'es' ? 'minutos' : 'minutes'}`;
    } else if (seconds > 1) {
      result = `${seconds} ${lang === 'es' ? 'segundos' : 'seconds'}`;
    } else {
      result = `1 ${lang === 'es' ? 'segundo' : 'second'}`;
    }
  }
  //* console.log(`Final result was: ${result}-`);
  return result;
}

export function adjustToMinYear(fechaStr: Date, minYear = 1900) {
  const fecha = new Date(fechaStr);
  let anno = fecha.getFullYear();
  if (anno < minYear) {
    anno = parseInt(`${minYear}`.slice(0, 2) + `${anno}`.slice(2, 4));
  }
  return new Date(anno, fecha.getMonth(), fecha.getDate());
}

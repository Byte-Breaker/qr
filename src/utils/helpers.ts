import { LogEntry as SupabaseLogEntry, WorkScheduleSettings } from '@/services/supabaseService';
// import { LogEntry } from './mockData';

export const getTodayLogs = (logs: SupabaseLogEntry[], employeeId: string) => {
  const today = new Date().toISOString().split('T')[0];
  return logs.filter(log => log.employee_id === employeeId && log.date === today);
};

export const getLatestLog = (logs: SupabaseLogEntry[], employeeId: string) => {
  const userLogs = logs.filter(log => log.employee_id === employeeId);
  if (userLogs.length === 0) {
    return undefined;
  }
  return userLogs.reduce((latest, current) => {
    const latestTime = new Date(`${latest.date}T${latest.time}`).getTime();
    const currentTime = new Date(`${current.date}T${current.time}`).getTime();
    return currentTime > latestTime ? current : latest;
  });
};

export const getDeviceInfo = () => {
  return navigator.userAgent;
};

export const getIpAddress = async () => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Failed to get IP address:', error);
    return 'Failed to retrieve IP';
  }
};

export const filterLogs = (
  logs: SupabaseLogEntry[],
  employeeId: string,
  startDate?: string,
  endDate?: string,
  type?: string
) => {
  let filtered = [...logs];
  
  filtered = filtered.filter(log => log.employee_id === employeeId);
  
  if (startDate) {
    filtered = filtered.filter(log => log.date >= startDate);
  }
  
  if (endDate) {
    filtered = filtered.filter(log => log.date <= endDate);
  }
  
  if (type && type !== 'all') {
    filtered = filtered.filter(log => log.type === type);
  }
  
  return filtered;
};

export const calculateWorkHours = (logs: SupabaseLogEntry[]) => {
  let totalMilliseconds = 0;
  
  const sortedLogs = [...logs].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`).getTime();
    const dateB = new Date(`${b.date}T${b.time}`).getTime();
    return dateA - dateB;
  });

  for (let i = 0; i < sortedLogs.length - 1; i += 2) {
    const checkIn = sortedLogs[i];
    const checkOut = sortedLogs[i + 1];

    if (checkIn.type === 'check-in' && checkOut.type === 'check-out') {
      const checkInTime = new Date(`${checkIn.date}T${checkIn.time}`).getTime();
      const checkOutTime = new Date(`${checkOut.date}T${checkOut.time}`).getTime();
      totalMilliseconds += checkOutTime - checkInTime;
    }
  }

  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${hours} saat ${minutes} dakika`;
};

// Add missing helper functions

// Format date to a more readable format
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Format time to a more readable format
export const formatTime = (timeString: string): string => {
  if (timeString && timeString.includes(':')) {
    return timeString.split(':').slice(0, 2).join(':');
  }
  return timeString || '';
};

// Get status color based on log type
export const getStatusColor = (type: string): string => {
  switch (type) {
    case 'check-in':
      return 'bg-green-100 text-green-800';
    case 'lunch-start':
      return 'bg-orange-100 text-orange-800';
    case 'lunch-end':
      return 'bg-blue-100 text-blue-800';
    case 'check-out':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Get human-readable status text
export const getStatusText = (type: string): string => {
  switch (type) {
    case 'check-in':
      return 'Giriş';
    case 'lunch-start':
      return 'Öğle Arası Başlangıç';
    case 'lunch-end':
      return 'Öğle Arası Bitiş';
    case 'check-out':
      return 'Çıkış';
    default:
      return 'Bilinmeyen İşlem';
  }
};

// Get latest status text description
export const getLatestStatusText = (log: SupabaseLogEntry): string => {
  switch (log.type) {
    case 'check-in':
      return 'İşe giriş yaptınız';
    case 'lunch-start':
      return 'Öğle arasına çıktınız';
    case 'lunch-end':
      return 'Öğle arasından döndünüz';
    case 'check-out':
      return 'İşten çıkış yaptınız';
    default:
      return 'Bilinmeyen işlem';
  }
};

// Type definitions for irregularity reporting
export type TimeIrregularityType = 
  | 'Geç Giriş' 
  | 'Erken Çıkış' 
  | 'Uzun Mola' 
  | 'Kısa Çalışma Günü'
  | 'Eksik Giriş/Çıkış Kaydı'
  | 'Eksik Mola Kaydı';

export interface IrregularityReportItem {
  employeeId: string;
  employeeName: string;
  departmentName?: string;
  date: string;
  type: TimeIrregularityType;
  details: string;
  actual?: string;
  expected?: string;
  duration?: string;
  expectedDuration?: string;
}

// Helper to convert HH:MM time string to minutes from midnight
const timeToMinutes = (timeStr: string): number => {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to format minutes to "X saat Y dakika"
const formatMinutesToHoursAndMinutes = (totalMinutes: number): string => {
  if (isNaN(totalMinutes) || totalMinutes < 0) return '0 dakika';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours} saat ${minutes} dakika`;
  }
  return `${minutes} dakika`;
};

export const identifyTimeIrregularities = (
  logs: Array<Pick<SupabaseLogEntry, 'employee_id' | 'date' | 'time' | 'type'> & { employeeName?: string }>,
  schedule: Pick<WorkScheduleSettings, 'work_start_time' | 'work_end_time' | 'lunch_start_time' | 'lunch_end_time'>,
  employeeNameParam?: string,
  departmentNameParam?: string
): IrregularityReportItem[] => {
  const irregularities: IrregularityReportItem[] = [];
  if (!schedule || !schedule.work_start_time || !schedule.work_end_time || !schedule.lunch_start_time || !schedule.lunch_end_time) {
    return irregularities;
  }

  const expectedWorkStartTime = timeToMinutes(schedule.work_start_time);
  const expectedWorkEndTime = timeToMinutes(schedule.work_end_time);
  const expectedLunchStartTime = timeToMinutes(schedule.lunch_start_time);
  const expectedLunchEndTime = timeToMinutes(schedule.lunch_end_time);
  const expectedLunchDuration = expectedLunchEndTime - expectedLunchStartTime;
  const expectedWorkDayDuration = (expectedWorkEndTime - expectedWorkStartTime) - expectedLunchDuration;

  const logsByDate: Record<string, Array<typeof logs[0]>> = {};
  logs.forEach(log => {
    if (!logsByDate[log.date]) {
      logsByDate[log.date] = [];
    }
    logsByDate[log.date].push(log);
  });

  for (const date in logsByDate) {
    const dailyLogs = logsByDate[date].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
    const resolvedEmployeeName = employeeNameParam || dailyLogs[0]?.employeeName || String(dailyLogs[0]?.employee_id || 'Bilinmeyen');

    const checkIns = dailyLogs.filter(log => log.type === 'check-in');
    const checkOuts = dailyLogs.filter(log => log.type === 'check-out');
    const lunchStarts = dailyLogs.filter(log => log.type === 'lunch-start');
    const lunchEnds = dailyLogs.filter(log => log.type === 'lunch-end');

    const firstCheckIn = checkIns[0];
    const lastCheckOut = checkOuts[checkOuts.length - 1];
    const firstLunchStart = lunchStarts[0];
    const lastLunchEnd = lunchEnds[lunchEnds.length - 1];

    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];
    const currentTimeInMinutes = today.getHours() * 60 + today.getMinutes();

    if (checkIns.length > 0 && checkOuts.length === 0 && firstCheckIn) {
      let isMissingCheckout = false;
      if (date < todayDateString) { // For past dates, it's always a missing checkout
        isMissingCheckout = true;
      } else if (date === todayDateString) { // For today, check if current time is past expected work end time
        if (currentTimeInMinutes > expectedWorkEndTime) {
          isMissingCheckout = true;
        }
      }

      if (isMissingCheckout) {
        irregularities.push({
          employeeId: String(firstCheckIn.employee_id),
          employeeName: resolvedEmployeeName,
          departmentName: departmentNameParam,
          date,
          type: 'Eksik Giriş/Çıkış Kaydı',
          details: `Giriş yapıldı (${formatTime(firstCheckIn.time)}) ancak gün sonu çıkış kaydı bulunamadı.`,
          actual: formatTime(firstCheckIn.time),
          expected: 'Çıkış Bekleniyor',
        });
      }
    }

    if (firstCheckIn && timeToMinutes(firstCheckIn.time) > expectedWorkStartTime) {
        irregularities.push({
          employeeId: String(firstCheckIn.employee_id),
          employeeName: resolvedEmployeeName,
          departmentName: departmentNameParam,
          date,
          type: 'Geç Giriş',
          details: `Beklenen ${formatTime(schedule.work_start_time)} yerine ${formatTime(firstCheckIn.time)} giriş yapıldı.`,
          expected: formatTime(schedule.work_start_time),
          actual: formatTime(firstCheckIn.time),
        });
    }
    
    if (lastCheckOut && timeToMinutes(lastCheckOut.time) < expectedWorkEndTime) {
        irregularities.push({
            employeeId: String(lastCheckOut.employee_id),
            employeeName: resolvedEmployeeName,
            departmentName: departmentNameParam,
            date,
            type: 'Erken Çıkış',
            details: `Beklenen ${formatTime(schedule.work_end_time)} yerine ${formatTime(lastCheckOut.time)} çıkış yapıldı.`,
            expected: formatTime(schedule.work_end_time),
            actual: formatTime(lastCheckOut.time),
        });
    }

    if (firstLunchStart && lastLunchEnd) {
        const actualLunchDuration = timeToMinutes(lastLunchEnd.time) - timeToMinutes(firstLunchStart.time);
        if (actualLunchDuration > expectedLunchDuration) {
            irregularities.push({
                employeeId: String(firstLunchStart.employee_id),
                employeeName: resolvedEmployeeName,
                departmentName: departmentNameParam,
                date,
                type: 'Uzun Mola',
                details: `Beklenen ${formatMinutesToHoursAndMinutes(expectedLunchDuration)} yerine ${formatMinutesToHoursAndMinutes(actualLunchDuration)} mola kullanıldı.`,
                expectedDuration: formatMinutesToHoursAndMinutes(expectedLunchDuration),
                duration: formatMinutesToHoursAndMinutes(actualLunchDuration),
            });
        }
    } else if (firstLunchStart && !lastLunchEnd) {
        irregularities.push({
            employeeId: String(firstLunchStart.employee_id),
            employeeName: resolvedEmployeeName,
            departmentName: departmentNameParam,
            date,
            type: 'Eksik Mola Kaydı',
            details: `Öğle arası başladı (${formatTime(firstLunchStart.time)}) ancak bitiş kaydı yok.`,
            actual: formatTime(firstLunchStart.time),
            expected: 'Mola Bitişi Bekleniyor'
        });
    } else if (!firstLunchStart && lastLunchEnd) {
         irregularities.push({
            employeeId: String(lastLunchEnd.employee_id),
            employeeName: resolvedEmployeeName,
            departmentName: departmentNameParam,
            date,
            type: 'Eksik Mola Kaydı',
            details: `Öğle arası bitiş kaydı (${formatTime(lastLunchEnd.time)}) var ancak başlangıç kaydı yok.`,
            actual: formatTime(lastLunchEnd.time),
            expected: 'Mola Başlangıcı Bekleniyor'
        });
    }

    if (firstCheckIn && lastCheckOut) {
        let actualWorkDuration = timeToMinutes(lastCheckOut.time) - timeToMinutes(firstCheckIn.time);
        if (firstLunchStart && lastLunchEnd) {
            actualWorkDuration -= (timeToMinutes(lastLunchEnd.time) - timeToMinutes(firstLunchStart.time));
        }
        // Only flag as short work day if there are no check-in/check-out irregularities for the day
        // to avoid redundant reporting if the day is already flagged as incomplete.
        const hasCheckInOutIrregularity = irregularities.some(ir => 
            ir.date === date && 
            ir.employeeId === String(firstCheckIn.employee_id) && 
            ir.type === 'Eksik Giriş/Çıkış Kaydı'
        );

        if (!hasCheckInOutIrregularity && actualWorkDuration < expectedWorkDayDuration) {
            irregularities.push({
                employeeId: String(firstCheckIn.employee_id),
                employeeName: resolvedEmployeeName,
                departmentName: departmentNameParam,
                date,
                type: 'Kısa Çalışma Günü',
                details: `Beklenen ${formatMinutesToHoursAndMinutes(expectedWorkDayDuration)} yerine ${formatMinutesToHoursAndMinutes(actualWorkDuration)} çalışıldı.`,
                expectedDuration: formatMinutesToHoursAndMinutes(expectedWorkDayDuration),
                duration: formatMinutesToHoursAndMinutes(actualWorkDuration),
            });
        }
    }
  }
  return irregularities;
};

export const calculateDailyWorkHoursMap = (logs: SupabaseLogEntry[]): Record<string, string> => {
  const workHoursMap: Record<string, string> = {};
  const logsByDate: Record<string, SupabaseLogEntry[]> = {};

  logs.forEach(log => {
    if (!logsByDate[log.date]) {
      logsByDate[log.date] = [];
    }
    logsByDate[log.date].push(log);
  });

  for (const date in logsByDate) {
    const dailyLogs = logsByDate[date].sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    
    let dailyTotalMilliseconds = 0;
    let lastCheckInTime: number | null = null;
    let onLunchBreak = false;

    for (const log of dailyLogs) {
      const currentTime = new Date(`${log.date}T${log.time}`).getTime();

      switch (log.type) {
        case 'check-in':
          if (!onLunchBreak) { // If not on lunch, this is a work check-in
            lastCheckInTime = currentTime;
          }
          break;
        case 'lunch-start':
          if (lastCheckInTime !== null && !onLunchBreak) {
            dailyTotalMilliseconds += currentTime - lastCheckInTime; 
          }
          lastCheckInTime = null; // Reset check-in time when lunch starts
          onLunchBreak = true;
          break;
        case 'lunch-end':
          // lastCheckInTime should be null here if flow is correct (check-in -> lunch-start -> lunch-end)
          // We effectively restart the work segment after lunch ends, so we just mark that we are no longer on break.
          // The next check-in will start a new segment.
          onLunchBreak = false;
          // We don't set lastCheckInTime here, it will be set by a subsequent 'check-in' log if user clocks back into work after lunch.
          // If company policy is that lunch-end automatically means back-to-work, this needs a check-in log or different logic.
          // For robust calculation, it might be better to only sum up check-in -> check-out and check-in -> lunch-start segments.
          // Then, separately calculate lunch-start -> lunch-end for lunch duration.
          // The current `calculateWorkHours` might be more straightforward for total work hours.
          // This `calculateDailyWorkHoursMap` attempts a more granular daily calculation.
          break;
        case 'check-out':
          if (lastCheckInTime !== null && !onLunchBreak) {
            dailyTotalMilliseconds += currentTime - lastCheckInTime;
            lastCheckInTime = null; // Reset after a check-out
          }
          // If onLunchBreak is true and a check-out happens, it means they didn't clock back in from lunch.
          // This time won't be added, which is correct as they were on break.
          break;
      }
    }
    // If there's an unclosed check-in at the end of the day (e.g. forgot to clock out), it's not counted here.
    // This could be another type of irregularity.

    if (dailyTotalMilliseconds > 0) {
      workHoursMap[date] = formatMinutesToHoursAndMinutes(Math.floor(dailyTotalMilliseconds / (1000 * 60)));
    } else {
      // If there are logs for the day but no calculable work time (e.g. only lunch logs, or only check-out)
      if(dailyLogs.length > 0) workHoursMap[date] = "Hesaplanamadı";
    }
  }
  return workHoursMap;
};

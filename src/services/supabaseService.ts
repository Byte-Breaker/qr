import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export interface Employee {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  department_id: string | null;
  role: 'admin' | 'user';
  avatar_url: string | null;
  created_at: string;
}

export interface LogEntry {
  id: string;
  employee_id: string;
  date: string;
  time: string;
  type: 'check-in' | 'check-out' | 'lunch-start' | 'lunch-end';
  device_info: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface EmployeeWithDepartment extends Employee {
  department: Department | null;
}

// Helper function to get employee data for the authenticated user
export const getCurrentEmployee = async (user: User | null): Promise<EmployeeWithDepartment | null> => {
  if (!user) return null;
  
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      department:departments(*)
    `)
    .eq('auth_id', user.id)
    .single();
    
  if (error) {
    console.error('Error fetching employee data:', error);
    return null;
  }
  
  return data as EmployeeWithDepartment;
};

// Employees
export const getEmployees = async (): Promise<EmployeeWithDepartment[]> => {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      department:departments(*)
    `)
    .order('name');
    
  if (error) {
    console.error('Error fetching employees:', error);
    toast({
      title: "Veri Yükleme Hatası",
      description: "Çalışan verileri yüklenirken bir hata oluştu.",
      variant: "destructive",
    });
    return [];
  }
  
  return data as EmployeeWithDepartment[];
};

// Function to create an initial employee profile after signup
export const createInitialEmployeeProfile = async (
  auth_id: string,
  name: string,
  email: string,
  avatar_url: string
): Promise<Employee | null> => {
  const { data, error } = await supabase
    .from('employees')
    .upsert(
      {
        auth_id,
        name,
        email,
        avatar_url, // Selfie URL from signup
        role: 'user', // Default role for new signups
        // department_id: null // Let department_id retain its value on update, or be null on new insert
      },
      {
        onConflict: 'auth_id', // Assumes auth_id is unique and the primary link to auth.users
        ignoreDuplicates: false // This means it will UPDATE on conflict
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting initial employee profile:', error);
    toast({
      title: "Profil İşlem Hatası",
      description: error.message.includes('unique constraint") && error.message.includes("employees_email_key') 
        ? `Bu email (${email}) ile zaten bir çalışan profili mevcut.` 
        : "Kullanıcı kaydı sonrası profil oluşturulamadı/güncellenemedi.",
      variant: "destructive",
    });
    return null;
  }
  console.log('Initial employee profile upserted:', data);
  return data as Employee;
};

export type NewEmployee = Omit<Employee, 'id' | 'created_at' | 'auth_id'>;

export const addEmployee = async (employeeData: NewEmployee): Promise<Employee | null> => {
  // Note: This function assumes the corresponding auth user (if any) is created separately.
  // Supabase client-side auth typically handles user creation.
  // This function only adds the employee profile to the 'employees' table.
  const { data, error } = await supabase
    .from('employees')
    .insert(employeeData)
    .select()
    .single();

  if (error) {
    console.error('Error adding employee:', error);
    toast({
      title: "Ekleme Hatası",
      description: "Yeni çalışan eklenirken bir hata oluştu.",
      variant: "destructive",
    });
    return null;
  }
  toast({
    title: "Ekleme Başarılı",
    description: "Yeni çalışan başarıyla eklendi.",
  });
  return data as Employee;
};

export const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<Employee | null> => {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
    
  if (error) {
    console.error('Error updating employee:', error);
    toast({
      title: "Güncelleme Hatası",
      description: "Çalışan bilgileri güncellenirken bir hata oluştu.",
      variant: "destructive",
    });
    return null;
  }
  
  toast({
    title: "Güncelleme Başarılı",
    description: "Çalışan bilgileri başarıyla güncellendi.",
  });
  
  return data as Employee;
};

export const deleteEmployee = async (employeeId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', employeeId);

  if (error) {
    console.error('Error deleting employee:', error);
    toast({
      title: "Silme Hatası",
      description: "Çalışan silinirken bir hata oluştu.",
      variant: "destructive",
    });
    return false;
  }
  toast({
    title: "Silme Başarılı",
    description: "Çalışan başarıyla silindi.",
  });
  return true;
};

// Departments
export const getDepartments = async (): Promise<Department[]> => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name');
    
  if (error) {
    console.error('Error fetching departments:', error);
    toast({
      title: "Veri Yükleme Hatası",
      description: "Departman verileri yüklenirken bir hata oluştu.",
      variant: "destructive",
    });
    return [];
  }
  
  return data as Department[];
};

export type NewDepartment = Omit<Department, 'id' | 'created_at'>;

export const createDepartment = async (departmentData: NewDepartment): Promise<Department | null> => {
  const { data, error } = await supabase
    .from('departments')
    .insert(departmentData)
    .select()
    .single();

  if (error) {
    console.error('Error creating department:', error);
    toast({
      title: "Oluşturma Hatası",
      description: "Departman oluşturulurken bir hata oluştu.",
      variant: "destructive",
    });
    return null;
  }
  toast({
    title: "Oluşturma Başarılı",
    description: "Departman başarıyla oluşturuldu.",
  });
  return data as Department;
};

export const updateDepartment = async (departmentId: string, updates: Partial<Department>): Promise<Department | null> => {
  const { data, error } = await supabase
    .from('departments')
    .update(updates)
    .eq('id', departmentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating department:', error);
    toast({
      title: "Güncelleme Hatası",
      description: "Departman güncellenirken bir hata oluştu.",
      variant: "destructive",
    });
    return null;
  }
  toast({
    title: "Güncelleme Başarılı",
    description: "Departman başarıyla güncellendi.",
  });
  return data as Department;
};

export const deleteDepartment = async (departmentId: string): Promise<boolean> => {
  // Before deleting a department, consider implications for employees linked to it.
  // You might want to set their department_id to null or prevent deletion if employees are linked.
  // For this example, we'll proceed with deletion.

  // First, update employees linked to this department to set their department_id to null
  const { error: updateEmployeesError } = await supabase
    .from('employees')
    .update({ department_id: null })
    .eq('department_id', departmentId);

  if (updateEmployeesError) {
    console.error('Error unlinking employees from department:', updateEmployeesError);
    toast({
      title: "Silme Hatası",
      description: "Departmana bağlı çalışanların bağlantısı kesilirken hata oluştu.",
      variant: "destructive",
    });
    return false;
  }
  
  const { error: deleteDepartmentError } = await supabase
    .from('departments')
    .delete()
    .eq('id', departmentId);

  if (deleteDepartmentError) {
    console.error('Error deleting department:', deleteDepartmentError);
    toast({
      title: "Silme Hatası",
      description: "Departman silinirken bir hata oluştu.",
      variant: "destructive",
    });
    return false;
  }
  toast({
    title: "Silme Başarılı",
    description: "Departman başarıyla silindi ve bağlı çalışanların bağlantıları kaldırıldı.",
  });
  return true;
};

// Logs
export const getUserLogs = async (employeeId: string): Promise<LogEntry[]> => {
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date', { ascending: false })
    .order('time', { ascending: false });
    
  if (error) {
    console.error('Error fetching user logs:', error);
    toast({
      title: "Veri Yükleme Hatası",
      description: "Giriş/çıkış kayıtları yüklenirken bir hata oluştu.",
      variant: "destructive",
    });
    return [];
  }
  
  return data as LogEntry[];
};

export const getAllLogs = async (): Promise<LogEntry[]> => {
  const { data, error } = await supabase
    .from('attendance_logs')
    .select(`
      *,
      employee:employees(id, name, email)
    `)
    .order('date', { ascending: false })
    .order('time', { ascending: false });
    
  if (error) {
    console.error('Error fetching all logs:', error);
    toast({
      title: "Veri Yükleme Hatası",
      description: "Giriş/çıkış kayıtları yüklenirken bir hata oluştu.",
      variant: "destructive",
    });
    return [];
  }
  
  // Cast the data to LogEntry[] to fix type issues
  return data as unknown as LogEntry[];
};

export const getTodayLogs = async (employeeId: string): Promise<LogEntry[]> => {
  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('date', today)
    .order('time', { ascending: false });
    
  if (error) {
    console.error('Error fetching today logs:', error);
    toast({
      title: "Veri Yükleme Hatası",
      description: "Bugünkü kayıtlar yüklenirken bir hata oluştu.",
      variant: "destructive",
    });
    return [];
  }
  
  return data as LogEntry[];
};

export const getLatestLog = async (employeeId: string): Promise<LogEntry | null> => {
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('*')
    .eq('employee_id', employeeId)
    .order('date', { ascending: false })
    .order('time', { ascending: false })
    .limit(1)
    .maybeSingle();
    
  if (error) {
    console.error('Error fetching latest log:', error);
    return null;
  }
  
  return data as LogEntry | null;
};

export const createLog = async (logData: Omit<LogEntry, 'id' | 'created_at'>): Promise<LogEntry | null> => {
  const { data, error } = await supabase
    .from('attendance_logs')
    .insert(logData)
    .select()
    .single();
    
  if (error) {
    console.error('Error creating log:', error);
    toast({
      title: "İşlem Hatası",
      description: "İşlem kaydı oluşturulurken bir hata oluştu.",
      variant: "destructive",
    });
    return null;
  }
  
  toast({
    title: "İşlem Başarılı",
    description: "İşlem kaydı başarıyla oluşturuldu.",
  });
  
  return data as LogEntry;
};

export const deleteLog = async (logId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('attendance_logs')
    .delete()
    .eq('id', logId);
    
  if (error) {
    console.error('Error deleting log:', error);
    toast({
      title: "Silme Hatası",
      description: "İşlem kaydı silinirken bir hata oluştu.",
      variant: "destructive",
    });
    return false;
  }
  
  toast({
    title: "Silme Başarılı",
    description: "İşlem kaydı başarıyla silindi.",
  });
  
  return true;
};

// Work Schedule Settings
export interface WorkScheduleSettings {
  id: string; // Primary key (e.g., UUID generated by Supabase)
  department_id: string; // Foreign key to departments table
  work_start_time: string; // Format HH:MM
  work_end_time: string;   // Format HH:MM
  lunch_start_time: string; // Format HH:MM
  lunch_end_time: string;   // Format HH:MM
  updated_at?: string;
}

// Fetches all work schedule settings for all departments
export const getAllWorkScheduleSettings = async (): Promise<WorkScheduleSettings[]> => {
  const { data, error } = await supabase
    .from('work_schedule_settings')
    .select('*');

  if (error) {
    console.error('Error fetching all work schedule settings:', error);
    toast({
      title: "Ayar Yükleme Hatası",
      description: "Tüm departmanların çalışma zamanı ayarları yüklenirken bir hata oluştu.",
      variant: "destructive",
    });
    return [];
  }
  return data as WorkScheduleSettings[];
};

// Fetches work schedule settings for a specific department
export const getWorkScheduleSettingsByDepartment = async (departmentId: string): Promise<WorkScheduleSettings | null> => {
  if (!departmentId) {
    console.warn('getWorkScheduleSettingsByDepartment called with no departmentId');
    return null;
  }
  const { data, error } = await supabase
    .from('work_schedule_settings')
    .select('*')
    .eq('department_id', departmentId)
    .maybeSingle(); // Use maybeSingle as a department might not have settings yet

  if (error) {
    console.error(`Error fetching work schedule settings for department ${departmentId}:`, error);
    // Avoid toasting for every department, could be many.
    // Consider a more central error reporting for this if it becomes noisy.
    return null;
  }
  return data as WorkScheduleSettings | null;
};


// Upserts work schedule settings for a specific department
export const upsertWorkScheduleSettings = async (
  department_id: string,
  settings: Omit<WorkScheduleSettings, 'id' | 'department_id' | 'updated_at'>
): Promise<WorkScheduleSettings | null> => {
  if (!department_id) {
    console.error('upsertWorkScheduleSettings called with no department_id');
    toast({
      title: "Kayıt Hatası",
      description: "Departman ID'si olmadan ayar kaydedilemez.",
      variant: "destructive",
    });
    return null;
  }

  const { data, error } = await supabase
    .from('work_schedule_settings')
    .upsert(
      { ...settings, department_id },
      { onConflict: 'department_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) {
    console.error('Error upserting work schedule settings:', error);
    // Check for specific RLS violation or other common errors
    if (error.message.includes('violates row-level security policy')) {
        toast({
            title: "Yetki Hatası",
            description: "Çalışma zamanı ayarlarını kaydetme yetkiniz yok. RLS politikalarını kontrol edin.",
            variant: "destructive",
        });
    } else if (error.message.includes('unique constraint') && error.message.includes('department_id')) {
        // This case should ideally be handled by onConflict, but good to be aware
        toast({
            title: "Veri Çakışması",
            description: "Bu departman için zaten bir ayar mevcut. Upsert mantığı beklenmedik şekilde çalıştı.",
            variant: "destructive",
        });
    }
     else {
        toast({
            title: "Kayıt Hatası",
            description: "Çalışma zamanı ayarları kaydedilirken bir hata oluştu.",
            variant: "destructive",
        });
    }
    return null;
  }

  toast({
    title: "Ayarlar Kaydedildi",
    description: "Çalışma zamanı ayarları başarıyla kaydedildi.",
  });
  return data as WorkScheduleSettings;
};

// Function to upload avatar image to Supabase Storage
export const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
  if (!userId || !file) {
    toast({
      title: "Yükleme Hatası",
      description: "Kullanıcı ID'si veya dosya eksik.",
      variant: "destructive",
    });
    return null;
  }

  const fileExtension = file.name.split('.').pop();
  const fileName = `${userId}/avatar.${fileExtension}`;
  // Using upsert:true so it overwrites if an avatar already exists for the user.
  // Make sure RLS policies allow this.
  const { data, error } = await supabase.storage
    .from('avatars') // Your bucket name
    .upload(fileName, file, { 
      cacheControl: '3600', 
      upsert: true 
    });

  if (error) {
    console.error('Error uploading avatar:', error);
    toast({
      title: "Avatar Yükleme Hatası",
      description: `Avatar yüklenirken bir hata oluştu: ${error.message}`,
      variant: "destructive",
    });
    return null;
  }

  // Get the public URL of the uploaded file
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(data.path);

  if (!urlData || !urlData.publicUrl) {
      console.error('Error getting public URL for avatar:', data.path);
      toast({
        title: "Avatar URL Hatası",
        description: "Avatar yüklendi ancak public URL alınamadı.",
        variant: "destructive",
      });
      // Potentially delete the uploaded file if URL retrieval fails and it's critical
      // await supabase.storage.from('avatars').remove([data.path]);
      return null;
  }
  
  return urlData.publicUrl;
};

// Utility functions for client-side info
export const getDeviceInfo = (): string => {
  const browser = navigator.userAgent;
  const screenSize = `${window.screen.width}x${window.screen.height}`;
  return `${browser} (${screenSize})`;
};

export const getIpAddress = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error fetching IP address:', error);
    return 'Unknown';
  }
};

// Filtering and calculation functions
export const filterLogs = (logs: LogEntry[], employeeId: string, startDate?: string, endDate?: string, type?: string): LogEntry[] => {
  return logs.filter(log => {
    let match = log.employee_id === employeeId;
    
    if (startDate) {
      match = match && log.date >= startDate;
    }
    
    if (endDate) {
      match = match && log.date <= endDate;
    }
    
    if (type && type !== 'all') {
      match = match && log.type === type;
    }
    
    return match;
  });
};

export const calculateWorkHours = (logs: LogEntry[]): string => {
  // Group logs by date
  const logsByDate = logs.reduce<Record<string, LogEntry[]>>((acc, log) => {
    if (!acc[log.date]) {
      acc[log.date] = [];
    }
    acc[log.date].push(log);
    return acc;
  }, {});
  
  let totalMinutes = 0;
  
  // Calculate work minutes for each day
  Object.values(logsByDate).forEach(dailyLogs => {
    const sortedLogs = [...dailyLogs].sort((a, b) => a.time.localeCompare(b.time));
    let checkInTime: Date | null = null;
    let lunchStartTime: Date | null = null;
    
    sortedLogs.forEach(log => {
      const logTime = new Date(`${log.date}T${log.time}`);
      
      if (log.type === 'check-in') {
        checkInTime = logTime;
      } else if (log.type === 'lunch-start' && checkInTime) {
        // Calculate work time before lunch
        totalMinutes += Math.floor((logTime.getTime() - checkInTime.getTime()) / (1000 * 60));
        lunchStartTime = logTime;
        checkInTime = null;
      } else if (log.type === 'lunch-end') {
        // Reset check-in time after lunch
        checkInTime = logTime;
      } else if (log.type === 'check-out' && checkInTime) {
        // Calculate work time after lunch or for the whole day
        totalMinutes += Math.floor((logTime.getTime() - checkInTime.getTime()) / (1000 * 60));
      }
    });
  });
  
  // Convert minutes to hours and minutes
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours} saat ${minutes} dakika`;
};

// New function to calculate work hours per day and return a map
export const calculateDailyWorkHoursMap = (logs: LogEntry[]): Record<string, string> => {
  const logsByDate = logs.reduce<Record<string, LogEntry[]>>((acc, log) => {
    if (!acc[log.date]) {
      acc[log.date] = [];
    }
    acc[log.date].push(log);
    return acc;
  }, {});

  const dailyWorkHours: Record<string, string> = {};

  Object.keys(logsByDate).forEach(date => {
    const dailyLogs = logsByDate[date];
    console.log(`[DEBUG] Processing date: ${date}`, dailyLogs);
    const sortedLogs = [...dailyLogs].sort((a, b) => a.time.localeCompare(b.time));
    let dailyTotalMinutes = 0;
    let checkInTime: Date | null = null;
    let lunchStartTime: Date | null = null;

    sortedLogs.forEach(log => {
      const logTime = new Date(`${log.date}T${log.time}`);
      console.log(`[DEBUG]  Processing log: ${log.type} at ${log.time}`, { 
        currentTime: logTime.toISOString(), 
        checkInTime: checkInTime?.toISOString(), 
        lunchStartTime: lunchStartTime?.toISOString(),
        currentDailyTotalMinutes: dailyTotalMinutes 
      });

      if (log.type === 'check-in') {
        if (checkInTime && !lunchStartTime) {
          console.log("[DEBUG]    New check-in, overriding previous checkInTime.");
        }
        checkInTime = logTime;
        lunchStartTime = null;
        console.log(`[DEBUG]    ${log.type} processed. checkInTime set to: ${checkInTime?.toISOString()}`);
      } else if (log.type === 'lunch-start') {
        if (checkInTime) {
          const minutesWorked = Math.max(0, Math.floor((logTime.getTime() - checkInTime.getTime()) / (1000 * 60)));
          dailyTotalMinutes += minutesWorked;
          console.log(`[DEBUG]    ${log.type} processed. Minutes worked before lunch: ${minutesWorked}. New total: ${dailyTotalMinutes}`);
          lunchStartTime = logTime;
          checkInTime = null; 
        } else {
          console.log("[DEBUG]    lunch-start without active checkInTime, ignored.");
        }
      } else if (log.type === 'lunch-end') {
        if (lunchStartTime) { 
            checkInTime = logTime; 
            lunchStartTime = null; 
            console.log(`[DEBUG]    ${log.type} processed. Resuming checkInTime at: ${checkInTime?.toISOString()}`);
        } else {
            checkInTime = logTime;
            console.log("[DEBUG]    lunch-end without active lunchStartTime, treating as new checkInTime.");
        }
      } else if (log.type === 'check-out') {
        if (checkInTime) {
          const minutesWorked = Math.max(0, Math.floor((logTime.getTime() - checkInTime.getTime()) / (1000 * 60)));
          dailyTotalMinutes += minutesWorked;
          console.log(`[DEBUG]    ${log.type} processed. Minutes worked: ${minutesWorked}. New total: ${dailyTotalMinutes}`);
          checkInTime = null; 
        } else {
          console.log("[DEBUG]    check-out without active checkInTime, ignored.");
        }
      }
    });
    
    console.log(`[DEBUG] Finished processing date: ${date}. Total minutes for day: ${dailyTotalMinutes}`);
    const hours = Math.floor(dailyTotalMinutes / 60);
    const minutes = dailyTotalMinutes % 60;
    dailyWorkHours[date] = `${hours} saat ${minutes} dakika`;
  });

  return dailyWorkHours;
};

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import LogsTable, { EnrichedLogEntry } from '@/components/LogsTable';
import FilterBar from '@/components/FilterBar';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Download, PlusCircle, Trash2, Edit, Settings, Users, BarChartHorizontal, QrCode, Building, AlertTriangle, Clock, LogOut, Coffee, CalendarX, RefreshCw, ListChecks } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import {
  getCurrentEmployee,
  getEmployees,
  getDepartments,
  getAllLogs,
  updateEmployee,
  addEmployee as addEmployeeService,
  deleteEmployee as deleteEmployeeService,
  createDepartment as addDepartmentService,
  updateDepartment as updateDepartmentService,
  deleteDepartment as deleteDepartmentService,
  Employee,
  Department,
  EmployeeWithDepartment,
  getAllWorkScheduleSettings,
  upsertWorkScheduleSettings,
  WorkScheduleSettings,
  NewDepartment,
  NewEmployee,
  filterLogs
} from '@/services/supabaseService';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  formatDate as formatDisplayDate,
  formatTime as formatDisplayTime,
  identifyTimeIrregularities,
  IrregularityReportItem,
  TimeIrregularityType
} from '@/utils/helpers';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { getInitials } from '@/lib/utils';
import { cn } from '@/lib/utils';

const getIrregularityIcon = (type: IrregularityReportItem['type']) => {
  switch (type) {
    case 'Geç Giriş':
      return <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400 mr-1.5 flex-shrink-0" />;
    case 'Erken Çıkış':
      return <LogOut className="h-4 w-4 text-orange-500 dark:text-orange-400 mr-1.5 flex-shrink-0" />;
    case 'Uzun Mola':
      return <Coffee className="h-4 w-4 text-sky-500 dark:text-sky-400 mr-1.5 flex-shrink-0" />;
    case 'Kısa Çalışma Günü':
      return <CalendarX className="h-4 w-4 text-red-600 dark:text-red-500 mr-1.5 flex-shrink-0" />;
    case 'Eksik Giriş/Çıkış Kaydı':
    case 'Eksik Mola Kaydı':
      return <AlertTriangle className="h-4 w-4 text-destructive mr-1.5 flex-shrink-0" />;
    default:
      return null;
  }
};

// Define the available irregularity types for filtering
const IRREGULARITY_TYPES: { id: TimeIrregularityType; label: string }[] = [
  { id: 'Geç Giriş', label: 'Geç Giriş' },
  { id: 'Erken Çıkış', label: 'Erken Çıkış' },
  { id: 'Uzun Mola', label: 'Uzun Mola' },
  { id: 'Kısa Çalışma Günü', label: 'Kısa Çalışma Günü' },
  { id: 'Eksik Giriş/Çıkış Kaydı', label: 'Eksik Giriş/Çıkış' },
  { id: 'Eksik Mola Kaydı', label: 'Eksik Mola Kaydı' },
];

const AdminPage: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  
  const [employees, setEmployees] = useState<EmployeeWithDepartment[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [logs, setLogs] = useState<EnrichedLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<EnrichedLogEntry[]>([]);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<EmployeeWithDepartment | null>(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeModalMode, setEmployeeModalMode] = useState<'add' | 'edit'>('add');
  const [currentEmployeeData, setCurrentEmployeeData] = useState<Partial<EmployeeWithDepartment>>({ name: '', email: '', role: 'user', department_id: undefined, avatar_url:'' });

  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [departmentModalMode, setDepartmentModalMode] = useState<'add' | 'edit'>('add');
  const [currentDepartmentData, setCurrentDepartmentData] = useState<Partial<Department>>({ name: ''});
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLogsTableLoading, setIsLogsTableLoading] = useState(false);
  
  const [qrCodeValue, setQrCodeValue] = useState<string>('');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [qrCodeTitle, setQrCodeTitle] = useState<string>('');

  const [allWorkSettings, setAllWorkSettings] = useState<Record<string, Partial<WorkScheduleSettings>>>({});
  const [selectedDepartmentForSettings, setSelectedDepartmentForSettings] = useState<string>('');
  const [currentDepartmentWorkSettings, setCurrentDepartmentWorkSettings] = useState<Partial<WorkScheduleSettings>>({
    work_start_time: '09:00',
    work_end_time: '18:00',
    lunch_start_time: '12:30',
    lunch_end_time: '13:30',
  });
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [timeIrregularities, setTimeIrregularities] = useState<IrregularityReportItem[]>([]);
  const [isIrregularitiesLoading, setIsIrregularitiesLoading] = useState(false);

  // New states for irregularity report filters
  const [reportFilterDepartmentId, setReportFilterDepartmentId] = useState<string>('all');
  const [reportFilterTypes, setReportFilterTypes] = useState<TimeIrregularityType[]>([]);

  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("logs");
  const [logFilterEmployeeId, setLogFilterEmployeeId] = useState<string>('all');

  const fetchAdminData = useCallback(async () => {
      if (!user) return;
    setIsLoading(true);

    try {
      const adminEmployeeData = await getCurrentEmployee(user);
      setCurrentEmployee(adminEmployeeData);
      if (!adminEmployeeData || adminEmployeeData.role !== 'admin') {
          setIsAdmin(false);
        setIsLoading(false);
        return;
      }
      setIsAdmin(true);

        const [fetchedEmployees, fetchedDepartments, rawLogs, fetchedAllWorkSettings] = await Promise.all([
          getEmployees(),
          getDepartments(),
          getAllLogs(),
        getAllWorkScheduleSettings()
        ]);
        
        setEmployees(fetchedEmployees);
        setDepartments(fetchedDepartments);

        const employeeMap = new Map(fetchedEmployees.map(emp => [emp.id, emp]));
        const enrichedLogsData: EnrichedLogEntry[] = rawLogs.map(log => {
          const employee = employeeMap.get(log.employee_id);
          return {
            ...log,
            employeeName: employee?.name || 'Bilinmiyor',
            departmentName: employee?.department?.name || 'Atanmamış',
            departmentId: employee?.department_id,
            avatar_url: employee?.avatar_url || undefined
          };
        });
        setLogs(enrichedLogsData);
        setFilteredLogs(enrichedLogsData);
        
      const settingsMap: Record<string, Partial<WorkScheduleSettings>> = {};
      fetchedAllWorkSettings.forEach(setting => {
        if(setting.department_id) settingsMap[setting.department_id] = setting;
      });
      setAllWorkSettings(settingsMap);

      if (fetchedDepartments.length > 0 && !selectedDepartmentForSettings) {
        const firstDepartmentId = fetchedDepartments[0].id;
        setSelectedDepartmentForSettings(firstDepartmentId);
        setCurrentDepartmentWorkSettings(settingsMap[firstDepartmentId] || { work_start_time: '09:00', work_end_time: '18:00', lunch_start_time: '12:30', lunch_end_time: '13:30' });
      } else if (selectedDepartmentForSettings && settingsMap[selectedDepartmentForSettings]){
        setCurrentDepartmentWorkSettings(settingsMap[selectedDepartmentForSettings]);
      } else if (selectedDepartmentForSettings && !settingsMap[selectedDepartmentForSettings]){
         setCurrentDepartmentWorkSettings({ work_start_time: '09:00', work_end_time: '18:00', lunch_start_time: '12:30', lunch_end_time: '13:30' });
        }
        
      } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast({ title: "Veri Yükleme Hatası", description: "Yönetici verileri yüklenirken bir hata oluştu.", variant: "destructive" });
      } finally {
        setIsLoading(false);
    }
  }, [user, toast, selectedDepartmentForSettings]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAdminData();
    } else if (!isAuthenticated && !authIsLoading) {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, authIsLoading, fetchAdminData]);
  
  useEffect(() => {
    if (selectedDepartmentForSettings && departments.length > 0) {
        const newSettings = allWorkSettings[selectedDepartmentForSettings] || {
          work_start_time: '09:00',
          work_end_time: '18:00',
          lunch_start_time: '12:30',
          lunch_end_time: '13:30',
        };
        setCurrentDepartmentWorkSettings(newSettings);
    } else if (departments.length === 0) {
        setSelectedDepartmentForSettings('');
        setCurrentDepartmentWorkSettings({ work_start_time: '09:00', work_end_time: '18:00', lunch_start_time: '12:30', lunch_end_time: '13:30' });
    }
  }, [selectedDepartmentForSettings, allWorkSettings, departments]);

  useEffect(() => {
    const calculateIrregularities = async () => {
      // Ensure all necessary data is available
      if (employees.length === 0 || logs.length === 0 || departments.length === 0 || Object.keys(allWorkSettings).length === 0) {
        setTimeIrregularities([]);
        return;
      }
      setIsIrregularitiesLoading(true);
      let allIrregularitiesData: IrregularityReportItem[] = [];

      for (const employee of employees) {
        // Ensure employee has a department and that department has settings
        if (!employee.department_id || !allWorkSettings[employee.department_id]) {
          // Optionally log or handle employees without department/schedule for irregularity report
          // console.warn(`Employee ${employee.name} (${employee.id}) skipped for irregularity report: No department or schedule.`);
          continue;
        }

        const employeeLogs = logs.filter(log => String(log.employee_id) === String(employee.id));
        if (employeeLogs.length === 0) continue;

        const departmentSchedule = allWorkSettings[employee.department_id];
        const department = departments.find(d => d.id === employee.department_id);

        if (departmentSchedule && departmentSchedule.work_start_time && departmentSchedule.work_end_time && departmentSchedule.lunch_start_time && departmentSchedule.lunch_end_time) {
          const logsForHelper = employeeLogs.map(log => ({
            employee_id: String(log.employee_id),
            date: log.date,
            time: log.time,
            type: log.type,
            employeeName: employee.name,
            // Add departmentName to each log item for the helper if needed, or pass it separately
          }));

          const scheduleForHelper = {
            work_start_time: departmentSchedule.work_start_time,
            work_end_time: departmentSchedule.work_end_time,
            lunch_start_time: departmentSchedule.lunch_start_time,
            lunch_end_time: departmentSchedule.lunch_end_time,
          };
          
          // Pass employee and department context to the helper if it needs it for richer reports
          const irregularitiesForEmployee = identifyTimeIrregularities(
            logsForHelper,
            scheduleForHelper,
            employee.name, // Pass employee name
            department?.name // Pass department name
          );
          allIrregularitiesData = allIrregularitiesData.concat(irregularitiesForEmployee);
        }
      }
      setTimeIrregularities(allIrregularitiesData);
      setIsIrregularitiesLoading(false);
    };

    if (activeTab === 'reports' && employees.length > 0 && logs.length > 0 && departments.length > 0 && Object.keys(allWorkSettings).length > 0) {
       calculateIrregularities();
    } else if (activeTab !== 'reports') {
        setTimeIrregularities([]); // Clear if tab is not active
    }
  }, [activeTab, employees, logs, departments, allWorkSettings]); // Recalculate if these change and tab is active

  // Memoized filtered irregularities
  const filteredTimeIrregularities = useMemo(() => {
    return timeIrregularities
      .filter(irregularity => {
        if (reportFilterDepartmentId === 'all') {
          return true;
        }
        // We need to associate irregularities with employees, and employees with departments.
        // The `IrregularityReportItem` should ideally have `departmentId` or `departmentName`.
        // Assuming `IrregularityReportItem` has `employeeId` and we have `employees` array.
        const employeeOfIrregularity = employees.find(emp => emp.id === irregularity.employeeId);
        return employeeOfIrregularity?.department_id === reportFilterDepartmentId;
      })
      .filter(irregularity => {
        if (reportFilterTypes.length === 0) {
          return true;
        }
        return reportFilterTypes.includes(irregularity.type);
      });
  }, [timeIrregularities, reportFilterDepartmentId, reportFilterTypes, employees]);

  const handleReportDepartmentFilterChange = (departmentId: string) => {
    setReportFilterDepartmentId(departmentId);
  };

  const handleReportTypeFilterChange = (type: TimeIrregularityType) => {
    setReportFilterTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleFilterChange = (startDate: string, endDate: string, type: string | undefined) => {
    setIsLogsTableLoading(true);
    const newFilteredLogs = filterLogs(logs, logFilterEmployeeId === 'all' ? undefined : logFilterEmployeeId, startDate, endDate, type);
    setFilteredLogs(newFilteredLogs);
    setTimeout(() => setIsLogsTableLoading(false), 300);
  };

  const handleRefreshData = () => {
    toast({ title: "Veri Yenileme", description: "Tüm yönetici verileri yeniden yükleniyor..."});
    fetchAdminData();
  };
  
  const openEmployeeModal = (mode: 'add' | 'edit', employee?: EmployeeWithDepartment) => {
    setEmployeeModalMode(mode);
    if (mode === 'edit' && employee) {
      setCurrentEmployeeData({...employee, department_id: employee.department_id || undefined });
      setEmployeeToEdit(employee);
    } else {
      setCurrentEmployeeData({ name: '', email: '', role: 'user', department_id: departments[0]?.id || undefined, avatar_url: '' });
      setEmployeeToEdit(null);
    }
    setIsEmployeeModalOpen(true);
  };

  const handleEmployeeFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentEmployeeData(prev => ({ ...prev, [name]: value }));
  };
  const handleEmployeeSelectChange = (name: string, value: string | undefined) => {
      setCurrentEmployeeData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEmployee = async () => {
    if (!currentEmployeeData.name || !currentEmployeeData.email || !currentEmployeeData.department_id) {
        toast({ title: "Eksik Bilgi", description: "Ad, email ve departman alanları zorunludur.", variant: "destructive"});
      return;
    }
    setIsProcessing(true);
    try {
        if (employeeModalMode === 'edit' && employeeToEdit) {
            await updateEmployee(employeeToEdit.id, {
                name: currentEmployeeData.name,
                email: currentEmployeeData.email,
                role: currentEmployeeData.role || 'user',
                department_id: currentEmployeeData.department_id,
                avatar_url: currentEmployeeData.avatar_url
            });
            toast({ title: "Başarılı", description: "Çalışan bilgileri güncellendi." });
        } else {
            await addEmployeeService({
                name: currentEmployeeData.name,
                email: currentEmployeeData.email,
                role: currentEmployeeData.role || 'user',
                department_id: currentEmployeeData.department_id,
                avatar_url: currentEmployeeData.avatar_url || null,
            });
            toast({ title: "Başarılı", description: "Yeni çalışan eklendi." });
        }
        fetchAdminData();
        setIsEmployeeModalOpen(false);
    } catch (error: any) {
        console.error("Error saving employee:", error);
        toast({ title: "Hata", description: error.message || "Çalışan kaydedilirken bir hata oluştu.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!window.confirm("Bu çalışanı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) return;
    setIsProcessing(true);
    try {
        await deleteEmployeeService(employeeId);
        toast({ title: "Başarılı", description: "Çalışan silindi." });
        fetchAdminData();
    } catch (error: any) {
        console.error("Error deleting employee:", error);
        toast({ title: "Hata", description: error.message || "Çalışan silinirken bir hata oluştu.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const openDepartmentModal = (mode: 'add' | 'edit', department?: Department) => {
    setDepartmentModalMode(mode);
    if (mode === 'edit' && department) {
        setCurrentDepartmentData(department);
      } else {
        setCurrentDepartmentData({ name: '' });
    }
    setIsDepartmentModalOpen(true);
  };

  const handleDepartmentFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentDepartmentData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveDepartment = async () => {
    if (!currentDepartmentData.name) {
        toast({ title: "Eksik Bilgi", description: "Departman adı zorunludur.", variant: "destructive"});
        return;
    }
    setIsProcessing(true);
    try {
        if (departmentModalMode === 'edit' && currentDepartmentData.id) {
            await updateDepartmentService(currentDepartmentData.id, { name: currentDepartmentData.name });
            toast({ title: "Başarılı", description: "Departman güncellendi." });
      } else {
            await addDepartmentService({ name: currentDepartmentData.name });
            toast({ title: "Başarılı", description: "Yeni departman eklendi." });
        }
        fetchAdminData();
        setIsDepartmentModalOpen(false);
    } catch (error: any) {
        console.error("Error saving department:", error);
        toast({ title: "Hata", description: error.message || "Departman kaydedilirken bir hata oluştu.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

 const handleDeleteDepartment = async (departmentId: string) => {
    if (!window.confirm("Bu departmanı silmek istediğinizden emin misiniz? Bu işlem, bağlı çalışanları etkileyebilir ve geri alınamaz.")) return;
    setIsProcessing(true);
    try {
        await deleteDepartmentService(departmentId);
        toast({ title: "Başarılı", description: "Departman silindi." });
        fetchAdminData();
    } catch (error: any) {
        console.error("Error deleting department:", error);
        toast({ title: "Hata", description: error.message || "Departman silinirken bir hata oluştu.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleWorkSettingsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentDepartmentWorkSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveWorkSchedule = async () => {
    if (!selectedDepartmentForSettings) {
        toast({ title: "Hata", description: "Lütfen önce bir departman seçin.", variant: "destructive"});
      return;
    }
    setIsSettingsLoading(true);
    try {
        const settingsPayload: Omit<WorkScheduleSettings, 'id' | 'department_id' | 'updated_at'> = {
            work_start_time: currentDepartmentWorkSettings.work_start_time,
            work_end_time: currentDepartmentWorkSettings.work_end_time,
            lunch_start_time: currentDepartmentWorkSettings.lunch_start_time,
            lunch_end_time: currentDepartmentWorkSettings.lunch_end_time,
        };

        await upsertWorkScheduleSettings(selectedDepartmentForSettings, settingsPayload);
        
        toast({ title: "Başarılı", description: `${departments.find(d => d.id === selectedDepartmentForSettings)?.name || 'Departman'} için çalışma saatleri kaydedildi.` });
        fetchAdminData();
    } catch (error: any) {
        console.error("Error saving work schedule settings:", error);
        toast({ title: "Hata", description: error.message || "Çalışma saatleri kaydedilirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsSettingsLoading(false);
    }
  };

  const generateQrCode = (value: string, title: string) => {
    setQrCodeValue(value);
    setQrCodeTitle(title);
    setIsQrModalOpen(true);
  };
  const qrTypes = [
    { label: "Giriş (Check-in)", value: "check-in" },
    { label: "Çıkış (Check-out)", value: "check-out" },
    { label: "Mola Başlangıç", value: "lunch-start" },
    { label: "Mola Bitiş", value: "lunch-end" },
  ];

  if (authIsLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-lg">Yönetici paneli yükleniyor...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
  return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold text-destructive mb-2">Erişim Reddedildi</h2>
        <p className="text-muted-foreground">Bu sayfayı görüntüleme yetkiniz bulunmamaktadır.</p>
        <Button onClick={() => window.history.back()} variant="outline" className="mt-6">Geri Dön</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Yönetim Paneli
        </h1>
        <Button onClick={handleRefreshData} variant="outline" size="sm" disabled={isLoading || isSettingsLoading || isIrregularitiesLoading || isProcessing || isLogsTableLoading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", (isLoading || isSettingsLoading || isIrregularitiesLoading || isProcessing || isLogsTableLoading) && "animate-spin")} />
            Verileri Yenile
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <ScrollArea className="w-full pb-2.5">
            <TabsList className="bg-muted/60 p-1 h-auto rounded-lg">
                <TabsTrigger value="logs" className="py-2 px-3 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md rounded-md">
                    <ListChecks className="w-4 h-4 mr-1.5" />Tüm İşlem Kayıtları
                </TabsTrigger>
                <TabsTrigger value="employees" className="py-2 px-3 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md rounded-md">
                    <Users className="w-4 h-4 mr-1.5" />Çalışan Yönetimi
                </TabsTrigger>
                <TabsTrigger value="departments" className="py-2 px-3 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md rounded-md">
                    <Building className="w-4 h-4 mr-1.5" />Departman Yönetimi
                </TabsTrigger>
                <TabsTrigger value="schedules" className="py-2 px-3 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md rounded-md">
                    <Settings className="w-4 h-4 mr-1.5" />Çalışma Takvimi Ayarları
                </TabsTrigger>
                <TabsTrigger value="reports" className="py-2 px-3 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md rounded-md">
                    <BarChartHorizontal className="w-4 h-4 mr-1.5" />Düzensizlik Raporları
                </TabsTrigger>
                 <TabsTrigger value="qr" className="py-2 px-3 text-sm data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-md rounded-md">
                    <QrCode className="w-4 h-4 mr-1.5" />QR Kod Oluşturucu
                </TabsTrigger>
          </TabsList>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="logs" className="mt-4">
          <Card className="shadow-md border-border/60">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">Tüm İşlem Kayıtları</CardTitle>
              <CardDescription>Sistemdeki tüm çalışanların işlem loglarını filtreleyerek görüntüleyin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-grow sm:max-w-xs w-full">
                    <Label htmlFor="employee-log-filter" className="block text-xs font-medium text-muted-foreground mb-1.5">Çalışana Göre Filtrele</Label>
                    <Select value={logFilterEmployeeId} onValueChange={setLogFilterEmployeeId}>
                        <SelectTrigger id="employee-log-filter" className="h-10 text-sm">
                            <SelectValue placeholder="Tüm Çalışanlar" />
                      </SelectTrigger>
                      <SelectContent>
                            <SelectItem value="all">Tüm Çalışanlar</SelectItem>
                            {employees.map(emp => (
                                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                <Button onClick={() => handleFilterChange('', '', undefined)} variant="outline" size="sm" className="h-10 text-sm w-full sm:w-auto">
                    Filtreyi Uygula/Sıfırla
                          </Button>
                        </div>
              <FilterBar onFilterChange={handleFilterChange} isLoading={isLogsTableLoading} />
              <LogsTable logs={filteredLogs} isLoading={isLogsTableLoading} isAdminView={true} onLogDeleted={fetchAdminData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          <Card className="shadow-md border-border/60">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-xl font-semibold text-foreground">Çalışan Yönetimi</CardTitle>
                <CardDescription>Yeni çalışan ekleyin, mevcutları düzenleyin veya silin.</CardDescription>
              </div>
              <Button onClick={() => openEmployeeModal('add')} size="sm">
                <PlusCircle className="w-4 h-4 mr-2"/> Yeni Çalışan Ekle
                </Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Avatar</TableHead>
                      <TableHead>Ad Soyad</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Departman</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead className="text-right w-[120px]">Eylemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Kayıtlı çalışan bulunamadı.</TableCell></TableRow>
                    )}
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell>
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={employee.avatar_url || undefined} alt={employee.name} />
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs">{getInitials(employee.name)}</AvatarFallback>
                            </Avatar>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">{employee.name}</TableCell>
                        <TableCell className="text-muted-foreground">{employee.email}</TableCell>
                        <TableCell className="text-muted-foreground">{employee.department?.name || 'Atanmamış'}</TableCell>
                        <TableCell>
                            <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'} className={employee.role === 'admin' ? 'bg-amber-500 hover:bg-amber-600' : ''}>
                            {employee.role === 'admin' ? 'Yönetici' : 'Kullanıcı'}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="hover:text-primary mr-1" onClick={() => openEmployeeModal('edit', employee)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteEmployee(employee.id)} disabled={employee.id === currentEmployee?.id}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="mt-4">
             <Card className="shadow-md border-border/60">
                <CardHeader className="flex flex-row justify-between items-center">
                <div>
                    <CardTitle className="text-xl font-semibold text-foreground">Departman Yönetimi</CardTitle>
                    <CardDescription>Yeni departman ekleyin, mevcutları düzenleyin veya silin.</CardDescription>
              </div>
                <Button onClick={() => openDepartmentModal('add')} size="sm">
                    <PlusCircle className="w-4 h-4 mr-2"/> Yeni Departman Ekle
                </Button>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="max-h-[600px]">
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>Departman Adı</TableHead>
                            <TableHead className="text-right w-[120px]">Eylemler</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {departments.length === 0 && (
                                <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-8">Kayıtlı departman bulunamadı.</TableCell></TableRow>
                            )}
                            {departments.map((dept) => (
                            <TableRow key={dept.id}>
                                <TableCell className="font-medium text-foreground">{dept.name}</TableCell>
                                <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="hover:text-primary mr-1" onClick={() => openDepartmentModal('edit', dept)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => handleDeleteDepartment(dept.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                         <ScrollBar orientation="vertical" />
                    </ScrollArea>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="schedules" className="mt-4">
          <Card className="shadow-md border-border/60">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">Çalışma Takvimi Ayarları</CardTitle>
              <CardDescription>Departman bazlı günlük çalışma ve mola saatlerini yapılandırın.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="department-select-schedule" className="text-sm font-medium">Departman Seçin</Label>
                <Select value={selectedDepartmentForSettings} onValueChange={setSelectedDepartmentForSettings}>
                  <SelectTrigger id="department-select-schedule" className="mt-1">
                    <SelectValue placeholder="Departman seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
            
              {selectedDepartmentForSettings && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end p-4 border rounded-lg bg-muted/30">
                  <div>
                    <Label htmlFor="work_start_time">İşe Başlama</Label>
                    <Input type="time" id="work_start_time" name="work_start_time" value={currentDepartmentWorkSettings.work_start_time || ''} onChange={handleWorkSettingsInputChange} className="mt-1" />
            </div>
                  <div>
                    <Label htmlFor="work_end_time">İş Bitiş</Label>
                    <Input type="time" id="work_end_time" name="work_end_time" value={currentDepartmentWorkSettings.work_end_time || ''} onChange={handleWorkSettingsInputChange} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="lunch_start_time">Mola Başlama</Label>
                    <Input type="time" id="lunch_start_time" name="lunch_start_time" value={currentDepartmentWorkSettings.lunch_start_time || ''} onChange={handleWorkSettingsInputChange} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="lunch_end_time">Mola Bitiş</Label>
                    <Input type="time" id="lunch_end_time" name="lunch_end_time" value={currentDepartmentWorkSettings.lunch_end_time || ''} onChange={handleWorkSettingsInputChange} className="mt-1" />
                  </div>
                  <Button onClick={handleSaveWorkSchedule} disabled={isSettingsLoading} className="sm:col-span-2 md:col-span-4 mt-2">
                    {isSettingsLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Settings className="h-4 w-4 mr-2"/>}
                    Ayarları Kaydet
                  </Button>
                </div>
              )}
              {departments.length === 0 && <p className="text-sm text-muted-foreground">Ayarları yapılandırmak için lütfen önce departman ekleyin.</p>}
            </CardContent>
          </Card>
          </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card className="shadow-lg border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl sm:text-2xl font-semibold text-foreground">Düzensizlik Raporları</CardTitle>
              <CardDescription className="text-sm">
                Çalışanların zaman çizelgelerindeki düzensizlikleri görüntüleyin ve filtreleyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pt-2">
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-6 gap-y-4 items-start p-4 border rounded-lg bg-muted/20">
                  <div className="lg:col-span-1 space-y-1.5">
                    <Label htmlFor="report-department-filter" className="text-sm font-medium">Departman Filtresi</Label>
                    <Select value={reportFilterDepartmentId} onValueChange={handleReportDepartmentFilterChange}>
                      <SelectTrigger id="report-department-filter" className="w-full h-10 text-sm">
                        <SelectValue placeholder="Departman Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Departmanlar</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="lg:col-span-2 space-y-1.5">
                    <Label className="text-sm font-medium block">Düzensizlik Tipi Filtresi</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 pt-1">
                      {IRREGULARITY_TYPES.map((type) => (
                        <div key={type.id} className="flex items-center space-x-2 min-h-[2.5rem]">
                          <Checkbox
                            id={`type-${type.id}`}
                            checked={reportFilterTypes.includes(type.id)}
                            onCheckedChange={() => handleReportTypeFilterChange(type.id)}
                          />
                          <Label htmlFor={`type-${type.id}`} className="text-sm font-normal cursor-pointer leading-tight">
                            {type.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {isIrregularitiesLoading ? (
                <div className="flex flex-col items-center justify-center h-60 space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-base text-muted-foreground">Raporlar yükleniyor...</p>
                </div>
              ) : filteredTimeIrregularities.length > 0 ? (
                <ScrollArea className="h-[500px] sm:h-[600px] w-full rounded-md border border-border/80">
                  <Table className="min-w-full whitespace-nowrap">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-normal sm:whitespace-nowrap w-[200px]">Çalışan</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-normal sm:whitespace-nowrap">Departman</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tarih</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-normal sm:whitespace-nowrap">Düzensizlik Tipi</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-normal min-w-[250px]">Detaylar</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Beklenen</TableHead>
                        <TableHead className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gerçekleşen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/60">
                      {filteredTimeIrregularities.map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="px-4 py-3.5 font-medium text-sm text-foreground whitespace-normal sm:whitespace-nowrap">
                            {item.employeeName || 'Bilinmiyor'}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-sm text-muted-foreground whitespace-normal sm:whitespace-nowrap">{item.departmentName || 'N/A'}</TableCell>
                          <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">{formatDisplayDate(item.date)}</TableCell>
                          <TableCell className="px-4 py-3.5 text-sm">
                            <Badge variant="outline" className={cn(
                                "py-1 px-2.5 text-xs font-medium leading-tight",
                                item.type === 'Geç Giriş' || item.type === 'Erken Çıkış' ? 'border-yellow-400 bg-yellow-50 text-yellow-700 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                item.type === 'Uzun Mola' ? 'border-sky-400 bg-sky-50 text-sky-700 dark:border-sky-600 dark:bg-sky-900/30 dark:text-sky-400' :
                                item.type === 'Kısa Çalışma Günü' ? 'border-orange-400 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                item.type === 'Eksik Giriş/Çıkış Kaydı' || item.type === 'Eksik Mola Kaydı' ? 'border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                'border-gray-300 bg-gray-50 text-gray-600 dark:border-gray-600 dark:bg-gray-900/30 dark:text-gray-400'
                            )}>
                               <div className="flex items-center">
                                {getIrregularityIcon(item.type)}
                                <span className="ml-1">{item.type}</span>
                               </div>
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-sm text-muted-foreground whitespace-normal min-w-[250px]">{item.details}</TableCell>
                          <TableCell className="px-4 py-3.5 text-sm text-muted-foreground"> 
                            {item.expectedDuration ? `${item.expectedDuration} (Mola)` : item.expected || '-'}
                          </TableCell>
                          <TableCell className="px-4 py-3.5 text-sm text-muted-foreground">
                            {item.duration ? `${item.duration} (Mola)` : item.actual || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-16">
                  <BarChartHorizontal className="mx-auto h-16 w-16 text-muted-foreground/30" />
                  <p className="mt-5 text-base font-semibold text-foreground">
                    Kayıt Bulunamadı
                  </p>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Seçili filtrelere uygun düzensizlik kaydı bulunamadı.
                  </p>
                   {timeIrregularities.length > 0 && <p className="text-xs text-muted-foreground/80 mt-2">Filtreleri temizlemeyi veya farklı bir departman seçmeyi deneyin.</p>}
                   {timeIrregularities.length === 0 && !isIrregularitiesLoading && <p className="text-xs text-muted-foreground/80 mt-2">Genel olarak görüntülenecek düzensizlik verisi yok.</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qr" className="mt-4">
            <Card className="shadow-md border-border/60">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-foreground">QR Kod Oluşturucu</CardTitle>
                    <CardDescription>İşlem türleri için genel QR kodları oluşturun.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {qrTypes.map(qr => (
                        <Button key={qr.value} variant="outline" className="w-full h-20 flex flex-col items-center justify-center text-center p-2" onClick={() => generateQrCode(qr.value, qr.label)}>
                            <QrCode className="w-6 h-6 mb-1 text-primary"/>
                            <span className="text-sm font-medium">{qr.label}</span>
                        </Button>
                    ))}
                </CardContent>
            </Card>
        </TabsContent>

        </Tabs>

      <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">{qrCodeTitle}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4 space-y-3">
            <QRCodeCanvas value={qrCodeValue} size={256} level="H" includeMargin={true} />
            <p className="text-sm text-muted-foreground">Değer: <code className="bg-muted px-1.5 py-0.5 rounded-sm">{qrCodeValue}</code></p>
            <Button onClick={() => { 
                const canvas = document.querySelector('canvas'); 
                if (canvas) { 
                    const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream'); 
                    let downloadLink = document.createElement('a'); 
                    downloadLink.href = pngUrl; 
                    downloadLink.download = `${qrCodeTitle.replace(/\s+/g, '_').toLowerCase()}_qr.png`; 
                    document.body.appendChild(downloadLink); 
                    downloadLink.click(); 
                    document.body.removeChild(downloadLink);
                }
            }} size="sm">
              <Download className="w-4 h-4 mr-2"/> PNG Olarak İndir
            </Button>
      </div>
        </DialogContent>
      </Dialog>

       <Dialog open={isEmployeeModalOpen} onOpenChange={setIsEmployeeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{employeeModalMode === 'edit' ? 'Çalışanı Düzenle' : 'Yeni Çalışan Ekle'}</DialogTitle>
            <DialogDescription>
              {employeeModalMode === 'edit' ? `Düzenlenen Çalışan: ${employeeToEdit?.name}` : 'Yeni çalışan bilgilerini girin.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="employee-name" className="text-right">Ad Soyad</Label>
              <Input id="employee-name" name="name" value={currentEmployeeData.name || ''} onChange={handleEmployeeFormChange} className="col-span-3" placeholder="Ahmet Yılmaz" />
              </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="employee-email" className="text-right">Email</Label>
              <Input id="employee-email" name="email" type="email" value={currentEmployeeData.email || ''} onChange={handleEmployeeFormChange} className="col-span-3" placeholder="ornek@sirket.com" />
              </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="employee-department" className="text-right">Departman</Label>
              <Select name="department_id" value={currentEmployeeData.department_id || ''} onValueChange={(value) => handleEmployeeSelectChange('department_id', value)}>
                <SelectTrigger id="employee-department" className="col-span-3">
                    <SelectValue placeholder="Departman seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map(dept => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="employee-role" className="text-right">Rol</Label>
              <Select name="role" value={currentEmployeeData.role || 'user'} onValueChange={(value) => handleEmployeeSelectChange('role', value)}>
                 <SelectTrigger id="employee-role" className="col-span-3">
                    <SelectValue placeholder="Rol seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Kullanıcı</SelectItem>
                    <SelectItem value="admin">Yönetici</SelectItem>
                  </SelectContent>
                </Select>
              </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="employee-avatar" className="text-right">Avatar URL</Label>
                <Input id="employee-avatar" name="avatar_url" value={currentEmployeeData.avatar_url || ''} onChange={handleEmployeeFormChange} className="col-span-3" placeholder="https://ornek.com/avatar.png (isteğe bağlı)" />
            </div>
            {employeeModalMode === 'add' && (
                <p className="col-span-4 text-xs text-muted-foreground text-center pt-2">Yeni çalışan için şifre Supabase Auth üzerinden veya davet e-postası ile ayarlanacaktır.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmployeeModalOpen(false)}>İptal</Button>
            <Button onClick={handleSaveEmployee} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : (employeeModalMode === 'edit' ? 'Değişiklikleri Kaydet' : 'Çalışanı Ekle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDepartmentModalOpen} onOpenChange={setIsDepartmentModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{departmentModalMode === 'edit' ? 'Departmanı Düzenle' : 'Yeni Departman Ekle'}</DialogTitle>
          </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="department-name" className="text-right">Departman Adı</Label>
                    <Input id="department-name" name="name" value={currentDepartmentData.name || ''} onChange={handleDepartmentFormChange} className="col-span-3" placeholder="Muhasebe" />
            </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDepartmentModalOpen(false)}>İptal</Button>
                <Button onClick={handleSaveDepartment} disabled={isProcessing}>
                    {isProcessing ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : (departmentModalMode === 'edit' ? 'Kaydet' : 'Ekle')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default AdminPage;

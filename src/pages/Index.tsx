import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import StatusCard from '@/components/StatusCard';
import QRScanner from '@/components/QRScanner';
import LogsTable from '@/components/LogsTable';
import { LogEntry, getCurrentEmployee, getTodayLogs, getLatestLog, createLog, getDeviceInfo, getIpAddress, EmployeeWithDepartment } from '@/services/supabaseService';
import { Loader2 } from 'lucide-react';

const Index: React.FC = () => {
  const [employee, setEmployee] = useState<EmployeeWithDepartment | null>(null);
  const [todayLogs, setTodayLogs] = useState<LogEntry[]>([]);
  const [latestLog, setLatestLog] = useState<LogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) {
        if(!authIsLoading) setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const employeeData = await getCurrentEmployee(user);
        setEmployee(employeeData);
        
        if (employeeData) {
          const fetchedTodayLogs = await getTodayLogs(employeeData.id);
          setTodayLogs(fetchedTodayLogs);
          
          const fetchedLatestLog = await getLatestLog(employeeData.id);
          setLatestLog(fetchedLatestLog);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        toast({
          title: "Veri Yükleme Hatası",
          description: "Kullanıcı verileri yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isAuthenticated && user) {
        fetchUserData();
    } else if (!isAuthenticated && !authIsLoading) {
        setIsLoading(false);
    }
  }, [user, isAuthenticated, authIsLoading, toast]);

  const handleSuccessfulScan = async (type: 'check-in' | 'check-out' | 'lunch-start' | 'lunch-end') => {
    if (!employee?.id) return;
    
    setIsLoading(true);
    try {
      const deviceInfo = getDeviceInfo();
      const ipAddress = await getIpAddress();
      
      const newLogData = {
        employee_id: employee.id,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].substring(0,8),
        type,
        device_info: deviceInfo,
        ip_address: ipAddress,
      };
      
      const newLog = await createLog(newLogData);
      
      if (newLog) {
        setTodayLogs(prevLogs => [newLog, ...prevLogs]);
        setLatestLog(newLog);
        toast({
            title: "İşlem Başarılı",
            description: `${type} kaydınız başarıyla oluşturuldu.`,
            variant: "default",
          });
      } else {
        throw new Error("Log creation returned null");
      }
    } catch (error) {
      console.error('Error creating log:', error);
      toast({
        title: "İşlem Hatası",
        description: "İşleminiz kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
    }
  };

  if (authIsLoading || (isLoading && !employee)) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-lg">Veriler yükleniyor...</p>
      </div>
    );
  }

  if (!isAuthenticated && !authIsLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
          <p className="text-muted-foreground text-lg">Giriş yapmanız gerekiyor.</p>
        </div>
      );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Panel
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
        <QRScanner onSuccessfulScan={handleSuccessfulScan} employeeId={employee?.id} latestLog={latestLog}/>
        
        <div className="space-y-6">
            <StatusCard 
                log={latestLog} 
                employeeName={employee?.name} 
                departmentName={employee?.department?.name}
                title={latestLog ? "Son İşleminiz" : "Bugün Henüz İşlem Yapılmadı"} 
            />
        </div>
      </div>
      
      <div className="bg-card rounded-xl shadow-lg p-4 sm:p-6 border border-border/60">
        <h2 className="text-xl font-semibold text-card-foreground mb-4 sm:mb-6">
          Bugünkü İşlemleriniz
        </h2>
        {isLoading && todayLogs.length === 0 ? (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        ) : todayLogs.length > 0 ? (
            <LogsTable logs={todayLogs} />
        ) : (
            <p className="text-muted-foreground text-center py-4">Bugün için kayıt bulunamadı.</p>
        )}
      </div>
    </div>
  );
};

export default Index;

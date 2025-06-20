import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import LogsTable, { EnrichedLogEntry } from '@/components/LogsTable';
import FilterBar from '@/components/FilterBar';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarDays, Clock, ListChecks, BarChart3 } from 'lucide-react';
import {
  getCurrentEmployee,
  getUserLogs,
  filterLogs,
  calculateDailyWorkHoursMap,
  Employee
} from '@/services/supabaseService';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const History: React.FC = () => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [allLogs, setAllLogs] = useState<EnrichedLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<EnrichedLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFilters, setIsLoadingFilters] = useState(false); // For filter operations
  const [dailyWorkHoursData, setDailyWorkHoursData] = useState<Record<string, string>>({});
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) {
        if (!authIsLoading) setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      try {
        const employeeData = await getCurrentEmployee(user);
        setEmployee(employeeData);
        
        if (employeeData) {
          const fetchedLogs = await getUserLogs(employeeData.id) as EnrichedLogEntry[];
          const enrichedLogs = fetchedLogs.map(log => ({
            ...log, 
            employeeName: employeeData.name || 'Unknown',
            avatar_url: employeeData.avatar_url || undefined
          }));
          setAllLogs(enrichedLogs);
          setFilteredLogs(enrichedLogs);
          
          const dailyHoursMap = calculateDailyWorkHoursMap(enrichedLogs);
          setDailyWorkHoursData(dailyHoursMap);
        }
      } catch (error) {
        console.error('Failed to fetch user data or logs:', error);
        toast({
          title: "Veri Yükleme Hatası",
          description: "Geçmiş verileriniz yüklenirken bir hata oluştu.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isAuthenticated && user) {
        fetchInitialData();
    } else if (!isAuthenticated && !authIsLoading) {
        setIsLoading(false);
    }
  }, [user, isAuthenticated, authIsLoading, toast]);

  const handleFilterChange = (startDate: string, endDate: string, type: string | undefined) => {
    if (!employee?.id) return;
    
    setIsLoadingFilters(true);
    // Simulate async filtering if needed, or directly filter
    setTimeout(() => {
      const currentFilteredLogs = filterLogs(allLogs, employee.id, startDate, endDate, type) as EnrichedLogEntry[];
      setFilteredLogs(currentFilteredLogs);
      
      const dailyHoursMap = calculateDailyWorkHoursMap(currentFilteredLogs);
      setDailyWorkHoursData(dailyHoursMap);
      setIsLoadingFilters(false);
    }, 300); // Simulate network delay for filter application
  };

  const displayTotalWorkHours = useMemo(() => {
    let totalMinutesOverall = 0;
    Object.values(dailyWorkHoursData).forEach(timeString => {
      const parts = timeString.match(/(\d+)\s*saat\s*(\d+)\s*dakika/);
      if (parts && parts.length === 3) {
        totalMinutesOverall += parseInt(parts[1], 10) * 60;
        totalMinutesOverall += parseInt(parts[2], 10);
      }
    });
    const overallHours = Math.floor(totalMinutesOverall / 60);
    const overallMinutes = totalMinutesOverall % 60;
    if (overallHours === 0 && overallMinutes === 0 && filteredLogs.length > 0 && Object.keys(dailyWorkHoursData).length === 0){
        // If logs exist but no work hours calculated (e.g. only check-out/lunch without check-in)
        return "Hesaplanamadı";
    }
    return `${overallHours} sa ${overallMinutes} dk`;
  }, [dailyWorkHoursData, filteredLogs]);

  if (authIsLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-lg">Geçmiş verileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          İşlem Geçmişim
        </h1>
        {/* Optional: Add a quick action button like "Export" or "Print" here if needed */}
      </div>

      {/* Summary Cards - now centered and with a max-width for the row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 max-w-3xl w-full mx-auto">
        <Card className="shadow-md border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Kayıt</CardTitle>
            <ListChecks className="h-5 w-5 text-primary/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{filteredLogs.length}</div>
            <p className="text-xs text-muted-foreground">adet işlem bulundu</p>
          </CardContent>
        </Card>
        
        <Card className="shadow-md border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gün Sayısı</CardTitle>
            <CalendarDays className="h-5 w-5 text-primary/80" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{Object.keys(dailyWorkHoursData).length}</div>
            <p className="text-xs text-muted-foreground">gün işlem yapıldı</p>
          </CardContent>
        </Card>
      </div>
      
      {/* FilterBar Section */}
      <Card className="shadow-md border-border/60 p-4 sm:p-6 max-w-5xl w-full mx-auto">
        <FilterBar onFilterChange={handleFilterChange} />
      </Card>
      
      <div className="grid grid-cols-1 gap-6 lg:gap-8 items-start">

        {/* İşlem Detayları card now takes full width available in the grid, constrained and centered */}
        <div className="bg-card rounded-xl shadow-lg border-border/60 max-w-5xl w-full mx-auto">
            <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center">
                     <ListChecks className="w-5 h-5 mr-2 text-primary"/>
                    İşlem Detayları
                </CardTitle>
            </CardHeader>
             <CardContent className="p-0 sm:p-0">
                <LogsTable logs={filteredLogs} isLoading={isLoadingFilters} className="border-none shadow-none rounded-none"/>
             </CardContent>
        </div>
      </div>
    </div>
  );
};

export default History;

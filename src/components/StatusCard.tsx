import React from 'react';
import { LogEntry, Employee } from '@/services/supabaseService';
import { Clock, Info, MapPin, User } from 'lucide-react';
import { cn } from "@/lib/utils";

interface StatusCardProps {
  log?: LogEntry | null;
  title: string;
  employeeName?: string;
  departmentName?: string;
}

const StatusCard: React.FC<StatusCardProps> = ({ log, title, employeeName, departmentName }) => {
  // Helper function to format time
  const formatTime = (time: string | undefined) => {
    if (!time) return '-';
    return time.substring(0,5);
  };

  // Helper function to get status color
  const getStatusColor = (type: string | undefined) => {
    if (!type) return 'bg-muted text-muted-foreground';
    
    switch (type) {
      case 'check-in':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400';
      case 'check-out':
        return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
      case 'lunch-start':
        return 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400';
      case 'lunch-end':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Helper function to get status text
  const getStatusText = (type: string | undefined) => {
    if (!type) return 'Bilinmiyor';
    
    switch (type) {
      case 'check-in':
        return 'Giriş Yapıldı';
      case 'check-out':
        return 'Çıkış Yapıldı';
      case 'lunch-start':
        return 'Mola Başladı';
      case 'lunch-end':
        return 'Mola Bitti';
      default:
        return 'Bilinmeyen İşlem';
    }
  };

  // Helper function to get latest status text
  const getLatestStatusText = (log: LogEntry | null | undefined) => {
    if (!log) return '';
    
    const date = new Date(log.date + 'T' + log.time);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-card rounded-xl shadow-lg p-5 sm:p-6 border border-border/60 flex flex-col h-full">
      <h2 className="text-xl font-semibold text-foreground mb-1">{title}</h2>
      {employeeName && <p className="text-sm text-muted-foreground mb-4">{employeeName} için son durum</p>}
      
      {log ? (
        <div className="space-y-3 flex-grow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className={cn("inline-flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold leading-none", getStatusColor(log.type))}>
                {getStatusText(log.type)}
              </div>
              <div className="text-sm text-muted-foreground">
                {getLatestStatusText(log)}
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground text-center py-3 my-2 bg-muted/30 rounded-lg">
              {formatTime(log.time)}
            </div>
          </div>

          <div className="space-y-2 text-sm pt-3 border-t border-border/30 mt-3">
            {employeeName && (
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center text-muted-foreground"><User className="w-4 h-4 mr-1.5 text-primary/80" />Çalışan Adı:</span>
                  <span className="font-medium text-foreground truncate max-w-[60%]">{employeeName}</span>
                </div>
            )}
            {departmentName && (
                <div className="flex justify-between items-center">
                  <span className="inline-flex items-center text-muted-foreground"><User className="w-4 h-4 mr-1.5 text-primary/80" />Departman:</span>
                  <span className="font-medium text-foreground truncate max-w-[60%]">{departmentName}</span>
                </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center flex-grow">
          <Clock size={48} className="text-muted-foreground/70 mb-4" />
          <p className="text-lg font-medium text-muted-foreground mb-1">
            İşlem Yok
          </p>
          <p className="text-sm text-muted-foreground/80">
            Bugün için henüz bir işlem kaydedilmemiş.
          </p>
        </div>
      )}
    </div>
  );
};

export default StatusCard;

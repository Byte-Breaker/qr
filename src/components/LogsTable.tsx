import React from 'react';
import { LogEntry, deleteLog } from '@/services/supabaseService';
import { Loader2, Trash2, UserCircle2, Building, Info, CalendarDays, ClockIcon } from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge, badgeVariants as badgeCreator } from "@/components/ui/badge";

// Define EnrichedLogEntry interface matching the one in Admin.tsx
export interface EnrichedLogEntry extends LogEntry {
  employeeName?: string;
  departmentName?: string;
  avatar_url?: string;
}

interface LogsTableProps {
  logs: EnrichedLogEntry[];
  isLoading?: boolean;
  isAdminView?: boolean;
  onLogDeleted?: (logId: string) => void;
  className?: string;
}

const LogsTable: React.FC<LogsTableProps> = ({ 
  logs, 
  isLoading = false, 
  isAdminView = false,
  onLogDeleted,
  className
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };
  
  const formatTime = (timeString: string) => {
      return timeString.substring(0,5); // HH:MM
  };

  // Returns a className string for the badge based on type
  const getStatusBadgeClass = (type: string): string => {
    switch (type) {
      case 'check-in':
        return cn(badgeCreator({ variant: "default" }), "bg-green-100 text-green-700 dark:bg-green-700/20 dark:text-green-400 hover:bg-green-200/80 dark:hover:bg-green-700/40 border-green-300 dark:border-green-700/50");
      case 'check-out':
        return cn(badgeCreator({ variant: "destructive" }), "border-red-300 dark:border-red-700/50");
      case 'lunch-start':
        return cn(badgeCreator({ variant: "secondary" }), "bg-sky-100 text-sky-700 dark:bg-sky-700/20 dark:text-sky-400 hover:bg-sky-200/80 dark:hover:bg-sky-700/40 border-sky-300 dark:border-sky-700/50");
      case 'lunch-end':
        return cn(badgeCreator({ variant: "default" }), "bg-amber-100 text-amber-700 dark:bg-amber-700/20 dark:text-amber-400 hover:bg-amber-200/80 dark:hover:bg-amber-700/40 border-amber-300 dark:border-amber-700/50");
      default:
        return cn(badgeCreator({ variant: "default" }));
    }
  };

  const getStatusText = (type: string) => {
    switch (type) {
      case 'check-in': return 'Giriş';
      case 'check-out': return 'Çıkış';
      case 'lunch-start': return 'Mola Başladı';
      case 'lunch-end': return 'Mola Bitti';
      default: return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    const success = await deleteLog(logId);
    if (success && onLogDeleted) {
      onLogDeleted(logId);
    }
    // Toast notifications for success/failure are handled within deleteLog service function
  };

  if (isLoading && logs.length === 0) { // Show loading only if there are no logs yet
    return <LoadingState />;
  }

  if (logs.length === 0 && !isLoading) { // Show empty state if not loading and no logs
    return <EmptyState />;
  }
  
  const getInitials = (name: string | undefined): string => {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    if (names[0] && names[0].length >=2) return names[0].substring(0, 2).toUpperCase();
    if (names[0] && names[0].length === 1) return names[0][0].toUpperCase();
    return '?';
  };

  // For mobile, we might want to show a card-based list instead of a table
  // This is a more involved change, for now, we will improve the table itself.

  return (
    <div className={cn("w-full", className)}>
        {/* Mobile Card View - hidden on md and up */}
        <div className="md:hidden space-y-3">
            {logs.map((log) => (
                <div key={`mobile-${log.id}`} className="bg-card rounded-lg shadow-md p-4 border border-border/70">
                    <div className="flex items-center justify-between mb-3">
                        {/* Always show Avatar and Name for History page (isAdminView is false) */}
                        <div className="flex items-center space-x-2 min-w-0">
                            <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarImage src={log.avatar_url || undefined} alt={log.employeeName} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">{getInitials(log.employeeName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{log.employeeName || 'Bilinmiyor'}</p>
                                {/* Department removed here as it's not requested for history view */}
                            </div>
                        </div>
                        
                        {isAdminView && ( // Delete button only for admin
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive flex-shrink-0 ml-2">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>İşlem Kaydını Sil</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Bu işlem kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>İptal</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteLog(log.id)} className={cn(buttonVariants({ variant: "destructive" }))}>Sil</AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                    {/* Action type badge shown below avatar/name block */}
                    <div className="mb-2"><Badge className={cn(getStatusBadgeClass(log.type), "text-xs px-2 py-0.5 sm:px-2.5 sm:py-1 whitespace-nowrap")}>{getStatusText(log.type)}</Badge></div>

                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                        <div className="flex items-center text-muted-foreground"><CalendarDays className="w-3.5 h-3.5 mr-1.5 text-primary/70 flex-shrink-0" />Tarih:</div>
                        <div className="text-foreground font-medium text-right truncate">{formatDate(log.date)}</div>
                        
                        <div className="flex items-center text-muted-foreground"><ClockIcon className="w-3.5 h-3.5 mr-1.5 text-primary/70 flex-shrink-0" />Saat:</div>
                        <div className="text-foreground font-medium text-right truncate">{formatTime(log.time)}</div>
                        
                        {/* Device info and IP address removed */}
                    </div>
                     {/* "Detayları Gör" button removed */}
                </div>
            ))}
        </div>

        {/* Desktop Table View - hidden on sm and down */}
      <div className="hidden md:block rounded-lg border border-border/60 overflow-x-auto">
        <Table className="min-w-full">
            <TableHeader className="bg-muted/50">
            <TableRow>
                {/* Avatar column added */}
                <TableHead className="py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[60px]">Avatar</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[200px]">{isAdminView ? 'Çalışan' : 'Kullanıcı Adı'}</TableHead>
                {isAdminView && <TableHead className="py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[150px]">Departman</TableHead>}
                <TableHead className="py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[120px]">Tarih</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-[100px]">Saat</TableHead>
                <TableHead className="py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">İşlem</TableHead>
                {isAdminView && <TableHead className="py-2.5 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider text-right w-[100px]">Eylemler</TableHead>}
            </TableRow>
            </TableHeader>
            <TableBody className="bg-card divide-y divide-border/60">
            {logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-muted/20 transition-colors duration-150">
                {/* Avatar cell added */}
                <TableCell className="py-2.5 px-3">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={log.avatar_url || undefined} alt={log.employeeName} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">{getInitials(log.employeeName)}</AvatarFallback>
                    </Avatar>
                </TableCell>
                <TableCell className="py-2.5 px-3 text-sm text-foreground whitespace-nowrap">{log.employeeName || 'Bilinmiyor'}</TableCell>
                {isAdminView && <TableCell className="py-2.5 px-3 text-sm text-muted-foreground whitespace-nowrap">{log.departmentName || 'N/A'}</TableCell>}
                <TableCell className="py-2.5 px-3 text-sm text-muted-foreground whitespace-nowrap">{formatDate(log.date)}</TableCell>
                <TableCell className="py-2.5 px-3 text-sm text-muted-foreground whitespace-nowrap">{formatTime(log.time)}</TableCell>
                <TableCell className="py-2.5 px-3 whitespace-nowrap">
                  <Badge className={cn(getStatusBadgeClass(log.type), "text-xs")}>{getStatusText(log.type)}</Badge>
                </TableCell>
                {isAdminView && (
                    <TableCell className="py-2.5 px-3 text-right">
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>İşlem Kaydını Sil</AlertDialogTitle>
                            <AlertDialogDescription>
                            Bu işlem kaydını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>İptal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteLog(log.id)} className={cn(buttonVariants({ variant: "destructive" }))}>Sil</AlertDialogAction>
                        </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    </TableCell>
                )}
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </div>
    </div>
  );
};

const LoadingState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-lg shadow-md border border-border/70 min-h-[200px]">
    <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
    <p className="text-lg font-medium text-muted-foreground">Kayıtlar Yükleniyor...</p>
    <p className="text-sm text-muted-foreground/80">Lütfen bekleyin.</p>
  </div>
);

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center bg-card rounded-lg shadow-md border border-border/70 min-h-[200px]">
    <Info className="h-12 w-12 text-muted-foreground/60 mb-4" strokeWidth={1.5}/>
    <p className="text-lg font-semibold text-foreground mb-1">Kayıt Bulunamadı</p>
    <p className="text-sm text-muted-foreground/80">
      Görüntülenecek herhangi bir işlem kaydı yok.
    </p>
  </div>
);

export default LogsTable;

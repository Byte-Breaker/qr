import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { CalendarIcon, FilterX, Search } from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isValid } from 'date-fns';
import { tr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  onFilterChange: (startDate: string, endDate: string, type: string | undefined) => void;
  isLoading?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({ onFilterChange, isLoading = false }) => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [type, setType] = useState<string | undefined>(undefined);
  
  const handleApplyFilter = () => {
    const formattedStartDate = startDate && isValid(startDate) ? format(startDate, 'yyyy-MM-dd') : '';
    const formattedEndDate = endDate && isValid(endDate) ? format(endDate, 'yyyy-MM-dd') : '';
    onFilterChange(formattedStartDate, formattedEndDate, type === 'all' ? undefined : type);
  };
  
  const handleResetFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setType(undefined);
    onFilterChange('', '', undefined);
  };
  
  return (
    <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-end">
      <div className="flex-grow w-full sm:w-auto sm:min-w-[180px]">
        <Label htmlFor="start-date-filter" className="block text-xs font-medium text-muted-foreground mb-1.5">
          Başlangıç Tarihi
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="start-date-filter"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal h-10 text-sm",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate && isValid(startDate) ? (
                format(startDate, 'd MMMM yyyy', { locale: tr })
              ) : (
                <span>Tarih seçin</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={setStartDate}
              initialFocus
              disabled={(date) => endDate && isValid(endDate) ? date > endDate : false}
              captionLayout="dropdown-buttons"
              fromYear={2020}
              toYear={new Date().getFullYear() + 1}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex-grow w-full sm:w-auto sm:min-w-[180px]">
        <Label htmlFor="end-date-filter" className="block text-xs font-medium text-muted-foreground mb-1.5">
          Bitiş Tarihi
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="end-date-filter"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal h-10 text-sm",
                !endDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {endDate && isValid(endDate) ? (
                format(endDate, 'd MMMM yyyy', { locale: tr })
              ) : (
                <span>Tarih seçin</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={setEndDate}
              initialFocus
              disabled={(date) => startDate && isValid(startDate) ? date < startDate : false}
              captionLayout="dropdown-buttons"
              fromYear={2020}
              toYear={new Date().getFullYear() + 1}
            />
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex-grow w-full sm:w-auto sm:min-w-[180px]">
        <Label htmlFor="type-filter" className="block text-xs font-medium text-muted-foreground mb-1.5">
          İşlem Türü
        </Label>
        <Select onValueChange={(value) => setType(value === 'all' ? undefined : value)} value={type || 'all'}>
          <SelectTrigger id="type-filter" className="h-10 text-sm">
            <SelectValue placeholder="Tüm Türler" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm İşlemler</SelectItem>
            <SelectItem value="check-in">Giriş</SelectItem>
            <SelectItem value="lunch-start">Mola Başladı</SelectItem>
            <SelectItem value="lunch-end">Mola Bitti</SelectItem>
            <SelectItem value="check-out">Çıkış</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex w-full sm:w-auto items-end space-x-2 pt-4 sm:pt-0">
        <Button 
          onClick={handleApplyFilter} 
          variant="default"
          className="w-full sm:w-auto h-10 text-sm flex-grow sm:flex-grow-0"
          disabled={isLoading}
        >
          <Search className="mr-2 h-4 w-4" />
          Filtrele
        </Button>
        <Button 
          onClick={handleResetFilters} 
          variant="outline"
          className="w-full sm:w-auto h-10 text-sm flex-grow sm:flex-grow-0"
          disabled={isLoading}
        >
          <FilterX className="mr-2 h-4 w-4" />
          Sıfırla
        </Button>
      </div>
    </div>
  );
};

export default FilterBar;

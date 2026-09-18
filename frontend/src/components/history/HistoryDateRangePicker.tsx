import * as React from "react"
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, isSameDay } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface HistoryDateRangePickerProps {
  date: DateRange | undefined;
  setDate: (date: DateRange | undefined) => void;
  className?: string;
}

const PRESETS = [
  { label: 'Hôm nay', getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: 'Hôm qua', getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  { label: '3 ngày trước', getValue: () => ({ from: subDays(new Date(), 2), to: new Date() }) },
  { label: '7 ngày trước', getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: '14 ngày trước', getValue: () => ({ from: subDays(new Date(), 13), to: new Date() }) },
  { label: 'Tuần này', getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 1 }), to: endOfWeek(new Date(), { weekStartsOn: 1 }) }) },
  { label: 'Tuần trước', getValue: () => ({ from: startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }), to: endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 }) }) },
  { label: '2 tuần trước', getValue: () => ({ from: startOfWeek(subWeeks(new Date(), 2), { weekStartsOn: 1 }), to: endOfWeek(subWeeks(new Date(), 2), { weekStartsOn: 1 }) }) },
  { label: 'Tháng này', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Tháng trước', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
];

export function HistoryDateRangePicker({
  date,
  setDate,
  className,
}: HistoryDateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full h-10 px-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-card text-foreground font-medium text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs hover:bg-muted/40 transition-all cursor-pointer justify-start text-left",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
            {date?.from ? (
              date.to ? (
                isSameDay(date.from, date.to) && isSameDay(date.from, new Date()) ? (
                  "Hôm nay"
                ) : isSameDay(date.from, date.to) ? (
                  format(date.from, "dd/MM/yyyy")
                ) : (
                  <>
                    {format(date.from, "dd/MM/yyyy")} - {format(date.to, "dd/MM/yyyy")}
                  </>
                )
              ) : (
                format(date.from, "dd/MM/yyyy")
              )
            ) : (
              <span>Chọn khoảng ngày</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[calc(100vw-2rem)] max-w-[340px] sm:max-w-none sm:w-auto p-0 rounded-2xl shadow-xl border border-border bg-card overflow-hidden" 
          align="start"
          sideOffset={6}
        >
          <div className="flex flex-col sm:flex-row">
            {/* Presets Grid (Mobile: 3-column clean layout, no truncation) */}
            <div className="grid grid-cols-3 gap-1.5 p-2.5 bg-muted/20 border-b border-border sm:hidden">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="px-1.5 py-1.5 text-center text-[11px] font-medium bg-card hover:bg-muted text-foreground rounded-lg transition-colors border border-border/60 active:scale-[0.98] cursor-pointer"
                  onClick={() => {
                    setDate(preset.getValue());
                    setIsOpen(false);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Presets Sidebar (Desktop) */}
            <div className="hidden sm:flex sm:flex-col gap-0.5 border-r border-border p-2 sm:w-36 sm:max-h-[340px] sm:overflow-y-auto bg-muted/10">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className="px-3 py-2 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-foreground hover:bg-muted rounded-xl transition-colors truncate cursor-pointer"
                  onClick={() => {
                    setDate(preset.getValue());
                    setIsOpen(false);
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            
            {/* Calendar */}
            <div className="p-3 pb-4 flex items-center justify-center">
              <Calendar
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={1}
                locale={vi}
                disabled={{ after: new Date() }}
                endMonth={new Date()}
                className="bg-transparent p-0"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

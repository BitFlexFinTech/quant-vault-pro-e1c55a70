import { ActivityLog, LogType } from '@/types/deriv';
import { cn } from '@/lib/utils';
import { Terminal } from 'lucide-react';

interface ActivityTerminalProps {
  logs: ActivityLog[];
}

const logColors: Record<LogType, string> = {
  SYS: 'text-system',
  SIG: 'text-signal',
  TRD: 'text-profit',
  VLT: 'text-vault',
  ERR: 'text-loss',
};

const logLabels: Record<LogType, string> = {
  SYS: 'SYS',
  SIG: 'SIG',
  TRD: 'TRD',
  VLT: 'VLT',
  ERR: 'ERR',
};

export function ActivityTerminal({ logs }: ActivityTerminalProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <aside className="w-80 bg-card border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Terminal className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Activity Terminal
        </h2>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto flex flex-col-reverse p-2 font-mono text-xs">
          <div className="space-y-1">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Awaiting activity...
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "p-2 rounded bg-muted/30 animate-slide-in",
                    "hover:bg-muted/50 transition-colors"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">
                      {formatTime(log.timestamp)}
                    </span>
                    <span className={cn(
                      "font-bold shrink-0",
                      logColors[log.type]
                    )}>
                      [{logLabels[log.type]}]
                    </span>
                    <span className="text-foreground break-words">
                      {log.message}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{logs.length} entries</span>
          <div className="flex gap-2">
            {(['SYS', 'SIG', 'TRD', 'VLT', 'ERR'] as LogType[]).map((type) => (
              <span key={type} className={cn("font-mono", logColors[type])}>
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

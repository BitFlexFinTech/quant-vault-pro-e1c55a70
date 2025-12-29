import { TradeExecution, TradeSignal } from '@/types/deriv';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Clock, Zap } from 'lucide-react';

interface ActivePositionsProps {
  activeTrades: TradeExecution[];
  currentSignal: TradeSignal | null;
}

export function ActivePositions({ activeTrades, currentSignal }: ActivePositionsProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Active Positions
        </h3>
        <span className="text-xs font-mono text-muted-foreground">
          {activeTrades.length} Open
        </span>
      </div>

      {currentSignal && (
        <div className="mb-4 p-3 rounded-lg bg-signal/10 border border-signal/30 animate-slide-in">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-signal" />
            <span className="text-xs font-semibold text-signal uppercase">
              AI Signal Active
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <p className="text-muted-foreground">Symbol</p>
              <p className="font-mono text-foreground">{currentSignal.symbol}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Direction</p>
              <div className="flex items-center gap-1">
                {currentSignal.direction === 'CALL' ? (
                  <TrendingUp className="h-3 w-3 text-success" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <span className={cn(
                  "font-mono",
                  currentSignal.direction === 'CALL' ? "text-success" : "text-destructive"
                )}>
                  {currentSignal.direction}
                </span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Confidence</p>
              <p className="font-mono text-primary text-glow-primary">
                {currentSignal.probability.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-48 overflow-y-auto">
        {activeTrades.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">
            No active positions
          </div>
        ) : (
          activeTrades.map((trade) => (
            <div
              key={trade.id}
              className="p-3 rounded-lg bg-muted/30 border border-border/50 flex items-center justify-between animate-slide-in"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-1.5 rounded",
                  trade.contractType === 'CALL' ? "bg-success/20" : "bg-destructive/20"
                )}>
                  {trade.contractType === 'CALL' ? (
                    <TrendingUp className={cn("h-3 w-3 text-success")} />
                  ) : (
                    <TrendingDown className={cn("h-3 w-3 text-destructive")} />
                  )}
                </div>
                <div>
                  <p className="text-xs font-mono text-foreground">{trade.symbol}</p>
                  <p className="text-[10px] text-muted-foreground">{trade.contractType}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs font-mono text-foreground">
                  ${trade.stake.toFixed(2)}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Pending</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

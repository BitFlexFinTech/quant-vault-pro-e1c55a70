import { useMemo } from 'react';
import { TradingAsset, TradeExecution } from '@/types/deriv';
import { cn } from '@/lib/utils';

interface AssetStatsProps {
  assets: TradingAsset[];
  tradeHistory: TradeExecution[];
}

export function AssetStats({ assets, tradeHistory }: AssetStatsProps) {
  const assetPerformance = useMemo(() => {
    const stats = new Map<string, { wins: number; losses: number; profit: number }>();

    tradeHistory.forEach((trade) => {
      const current = stats.get(trade.symbol) || { wins: 0, losses: 0, profit: 0 };
      if (trade.isWin) {
        current.wins++;
      } else if (trade.isWin === false) {
        current.losses++;
      }
      current.profit += trade.profit || 0;
      stats.set(trade.symbol, current);
    });

    return stats;
  }, [tradeHistory]);

  const displayAssets = assets.slice(0, 8);

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
        Asset Performance
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {displayAssets.map((asset) => {
          const perf = assetPerformance.get(asset.symbol);
          const winRate = perf && (perf.wins + perf.losses) > 0
            ? (perf.wins / (perf.wins + perf.losses)) * 100
            : 0;

          return (
            <div
              key={asset.symbol}
              className="p-3 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-foreground truncate">
                  {asset.symbol}
                </span>
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  asset.isOpen ? "bg-success" : "bg-destructive"
                )} />
              </div>
              
              {perf ? (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">W/L</span>
                    <span className="font-mono">
                      <span className="text-success">{perf.wins}</span>
                      <span className="text-muted-foreground">/</span>
                      <span className="text-destructive">{perf.losses}</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">P/L</span>
                    <span className={cn(
                      "font-mono",
                      perf.profit >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {perf.profit >= 0 ? '+' : ''}${perf.profit.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${winRate}%` }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">No trades</p>
              )}
            </div>
          );
        })}
      </div>

      {assets.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Connecting to market data...
        </div>
      )}
    </div>
  );
}

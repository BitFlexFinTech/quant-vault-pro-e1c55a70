import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TradeExecution } from '@/types/deriv';

interface TradingChartProps {
  tradeHistory: TradeExecution[];
  totalProfit: number;
}

export function TradingChart({ tradeHistory, totalProfit }: TradingChartProps) {
  const chartData = useMemo(() => {
    if (tradeHistory.length === 0) {
      return Array.from({ length: 20 }, (_, i) => ({
        time: i,
        profit: 0,
        cumulative: 0,
      }));
    }

    let cumulative = 0;
    return tradeHistory
      .slice()
      .reverse()
      .map((trade, index) => {
        cumulative += trade.profit || 0;
        return {
          time: index + 1,
          profit: trade.profit || 0,
          cumulative,
          symbol: trade.symbol,
          isWin: trade.isWin,
        };
      });
  }, [tradeHistory]);

  const gradientOffset = useMemo(() => {
    const dataMax = Math.max(...chartData.map((d) => d.cumulative));
    const dataMin = Math.min(...chartData.map((d) => d.cumulative));

    if (dataMax <= 0) return 0;
    if (dataMin >= 0) return 1;

    return dataMax / (dataMax - dataMin);
  }, [chartData]);

  return (
    <div className="bg-card rounded-lg border border-border p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Performance Chart
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-muted-foreground">Profit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive" />
            <span className="text-muted-foreground">Loss</span>
          </div>
        </div>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(142, 76%, 46%)" stopOpacity={0.4} />
                <stop offset={`${gradientOffset * 100}%`} stopColor="hsl(142, 76%, 46%)" stopOpacity={0.1} />
                <stop offset={`${gradientOffset * 100}%`} stopColor="hsl(0, 72%, 51%)" stopOpacity={0.1} />
                <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.4} />
              </linearGradient>
              <linearGradient id="strokeGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset={`${gradientOffset * 100}%`} stopColor="hsl(142, 76%, 46%)" />
                <stop offset={`${gradientOffset * 100}%`} stopColor="hsl(0, 72%, 51%)" />
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="hsl(222, 30%, 18%)" 
              vertical={false}
            />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(222, 47%, 10%)',
                border: '1px solid hsl(222, 30%, 18%)',
                borderRadius: '8px',
                padding: '12px',
              }}
              labelStyle={{ color: 'hsl(210, 40%, 96%)' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative P/L']}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="url(#strokeGradient)"
              strokeWidth={2}
              fill="url(#profitGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Trophy, 
  Target,
  Calendar,
  BarChart3,
  PieChart,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';

interface TradeRecord {
  id: string;
  timestamp: string;
  symbol: string;
  contract_type: string;
  stake: number;
  profit: number | null;
  is_win: boolean | null;
  currency: string;
}

interface VaultRecord {
  id: string;
  amount: number;
  locked_at: string;
}

const COLORS = ['hsl(142, 76%, 46%)', 'hsl(0, 72%, 51%)', 'hsl(187, 92%, 50%)', 'hsl(45, 93%, 58%)'];

export default function Analytics() {
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [vaultLocks, setVaultLocks] = useState<VaultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    
    let dateFilter = new Date();
    if (dateRange === '24h') {
      dateFilter.setDate(dateFilter.getDate() - 1);
    } else if (dateRange === '7d') {
      dateFilter.setDate(dateFilter.getDate() - 7);
    } else if (dateRange === '30d') {
      dateFilter.setDate(dateFilter.getDate() - 30);
    } else {
      dateFilter = new Date(0);
    }

    const { data: tradeData } = await supabase
      .from('trade_history')
      .select('*')
      .gte('timestamp', dateFilter.toISOString())
      .order('timestamp', { ascending: false });

    const { data: vaultData } = await supabase
      .from('vault_locks')
      .select('*')
      .gte('locked_at', dateFilter.toISOString())
      .order('locked_at', { ascending: false });

    setTrades(tradeData || []);
    setVaultLocks(vaultData || []);
    setLoading(false);
  };

  const metrics = useMemo(() => {
    const completedTrades = trades.filter(t => t.is_win !== null);
    const wins = completedTrades.filter(t => t.is_win === true);
    const losses = completedTrades.filter(t => t.is_win === false);
    
    const totalProfit = trades.reduce((sum, t) => sum + (t.profit || 0), 0);
    const totalStake = trades.reduce((sum, t) => sum + t.stake, 0);
    const avgStake = trades.length > 0 ? totalStake / trades.length : 0;
    const winRate = completedTrades.length > 0 ? (wins.length / completedTrades.length) * 100 : 0;
    const avgWinAmount = wins.length > 0 ? wins.reduce((sum, t) => sum + (t.profit || 0), 0) / wins.length : 0;
    const avgLossAmount = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + (t.profit || 0), 0) / losses.length) : 0;
    const profitFactor = avgLossAmount > 0 ? avgWinAmount / avgLossAmount : avgWinAmount;
    const vaultTotal = vaultLocks.reduce((sum, v) => sum + Number(v.amount), 0);

    let maxDrawdown = 0;
    let peak = 0;
    let cumulative = 0;
    trades.slice().reverse().forEach(t => {
      cumulative += t.profit || 0;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    });

    return {
      totalTrades: trades.length,
      completedTrades: completedTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate,
      totalProfit,
      totalStake,
      avgStake,
      avgWinAmount,
      avgLossAmount,
      profitFactor,
      maxDrawdown,
      vaultTotal,
      roi: totalStake > 0 ? (totalProfit / totalStake) * 100 : 0,
    };
  }, [trades, vaultLocks]);

  const chartData = useMemo(() => {
    let cumulative = 0;
    return trades
      .slice()
      .reverse()
      .map((trade, index) => {
        cumulative += trade.profit || 0;
        return {
          index: index + 1,
          profit: trade.profit || 0,
          cumulative,
          symbol: trade.symbol,
          time: new Date(trade.timestamp).toLocaleDateString(),
        };
      });
  }, [trades]);

  const symbolPerformance = useMemo(() => {
    const symbolMap = new Map<string, { wins: number; losses: number; profit: number; trades: number }>();
    
    trades.forEach(trade => {
      const current = symbolMap.get(trade.symbol) || { wins: 0, losses: 0, profit: 0, trades: 0 };
      current.trades++;
      current.profit += trade.profit || 0;
      if (trade.is_win === true) current.wins++;
      if (trade.is_win === false) current.losses++;
      symbolMap.set(trade.symbol, current);
    });

    return Array.from(symbolMap.entries())
      .map(([symbol, data]) => ({
        symbol,
        ...data,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [trades]);

  const pieData = useMemo(() => [
    { name: 'Wins', value: metrics.wins, color: COLORS[0] },
    { name: 'Losses', value: metrics.losses, color: COLORS[1] },
  ], [metrics]);

  const hourlyDistribution = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, trades: 0, profit: 0 }));
    
    trades.forEach(trade => {
      const hour = new Date(trade.timestamp).getHours();
      hours[hour].trades++;
      hours[hour].profit += trade.profit || 0;
    });

    return hours;
  }, [trades]);

  const exportToCSV = () => {
    const headers = ['ID', 'Timestamp', 'Symbol', 'Contract Type', 'Stake', 'Profit', 'Is Win', 'Currency'];
    const csvContent = [
      headers.join(','),
      ...trades.map(t => [
        t.id,
        t.timestamp,
        t.symbol,
        t.contract_type,
        t.stake,
        t.profit || 0,
        t.is_win ?? 'pending',
        t.currency
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `trade_history_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      metrics,
      trades,
      vaultLocks,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="h-6 w-px bg-border" />
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Trade Analytics
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-muted rounded-lg p-1">
            {(['24h', '7d', '30d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded transition-colors",
                  dateRange === range
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportToJSON}>
              <Download className="h-4 w-4 mr-2" />
              JSON
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <>
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Trades', value: metrics.totalTrades, icon: Target, color: 'text-primary' },
                { label: 'Win Rate', value: `${metrics.winRate.toFixed(1)}%`, icon: Trophy, color: metrics.winRate >= 85 ? 'text-success' : 'text-warning' },
                { label: 'Total Profit', value: `$${metrics.totalProfit.toFixed(2)}`, icon: TrendingUp, color: metrics.totalProfit >= 0 ? 'text-success' : 'text-destructive' },
                { label: 'Profit Factor', value: metrics.profitFactor.toFixed(2), icon: BarChart3, color: metrics.profitFactor >= 1.5 ? 'text-success' : 'text-warning' },
                { label: 'Max Drawdown', value: `$${metrics.maxDrawdown.toFixed(2)}`, icon: TrendingDown, color: 'text-destructive' },
                { label: 'Vault Locked', value: `$${metrics.vaultTotal.toFixed(2)}`, icon: Calendar, color: 'text-vault' },
              ].map((metric) => (
                <div key={metric.label} className="bg-card rounded-lg border border-border p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <metric.icon className={cn("h-4 w-4", metric.color)} />
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      {metric.label}
                    </span>
                  </div>
                  <p className={cn("text-2xl font-bold font-mono", metric.color)}>
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cumulative P/L Chart */}
              <div className="lg:col-span-2 bg-card rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                  Cumulative P/L
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(187, 92%, 50%)" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(187, 92%, 50%)" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                      <XAxis dataKey="index" tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                      <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(222, 47%, 10%)',
                          border: '1px solid hsl(222, 30%, 18%)',
                          borderRadius: '8px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke="hsl(187, 92%, 50%)"
                        strokeWidth={2}
                        fill="url(#profitFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Win/Loss Pie */}
              <div className="bg-card rounded-lg border border-border p-4">
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                  <PieChart className="h-4 w-4 text-primary" />
                  Win/Loss Ratio
                </h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend />
                      <Tooltip />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Hourly Distribution */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                Hourly Trading Distribution
              </h3>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                    <XAxis 
                      dataKey="hour" 
                      tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }}
                      tickFormatter={(h) => `${h}:00`}
                    />
                    <YAxis tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(222, 47%, 10%)',
                        border: '1px solid hsl(222, 30%, 18%)',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="trades" fill="hsl(187, 92%, 50%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Symbol Performance Table */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                Performance by Symbol
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Symbol</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Trades</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Wins</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Losses</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Win Rate</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">P/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symbolPerformance.slice(0, 10).map((sym) => (
                      <tr key={sym.symbol} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4 font-mono">{sym.symbol}</td>
                        <td className="text-right py-3 px-4 font-mono">{sym.trades}</td>
                        <td className="text-right py-3 px-4 font-mono text-success">{sym.wins}</td>
                        <td className="text-right py-3 px-4 font-mono text-destructive">{sym.losses}</td>
                        <td className="text-right py-3 px-4 font-mono">
                          <span className={cn(
                            sym.winRate >= 85 ? 'text-success' : sym.winRate >= 70 ? 'text-warning' : 'text-destructive'
                          )}>
                            {sym.winRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className={cn(
                          "text-right py-3 px-4 font-mono font-semibold",
                          sym.profit >= 0 ? 'text-success' : 'text-destructive'
                        )}>
                          {sym.profit >= 0 ? '+' : ''}${sym.profit.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {symbolPerformance.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No trades recorded yet
                  </div>
                )}
              </div>
            </div>

            {/* Recent Trades */}
            <div className="bg-card rounded-lg border border-border p-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">
                Recent Trades ({trades.length})
              </h3>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-card">
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Time</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Symbol</th>
                      <th className="text-left py-3 px-4 text-muted-foreground font-medium">Type</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Stake</th>
                      <th className="text-right py-3 px-4 text-muted-foreground font-medium">Profit</th>
                      <th className="text-center py-3 px-4 text-muted-foreground font-medium">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 50).map((trade) => (
                      <tr key={trade.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {new Date(trade.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-mono">{trade.symbol}</td>
                        <td className="py-3 px-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            trade.contract_type === 'CALL' 
                              ? 'bg-success/20 text-success' 
                              : 'bg-destructive/20 text-destructive'
                          )}>
                            {trade.contract_type}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 font-mono">
                          ${trade.stake.toFixed(2)}
                        </td>
                        <td className={cn(
                          "text-right py-3 px-4 font-mono",
                          (trade.profit || 0) >= 0 ? 'text-success' : 'text-destructive'
                        )}>
                          {trade.profit !== null ? `${trade.profit >= 0 ? '+' : ''}$${trade.profit.toFixed(2)}` : '-'}
                        </td>
                        <td className="text-center py-3 px-4">
                          {trade.is_win === true && (
                            <span className="inline-flex items-center gap-1 text-success text-xs font-medium">
                              <TrendingUp className="h-3 w-3" /> WIN
                            </span>
                          )}
                          {trade.is_win === false && (
                            <span className="inline-flex items-center gap-1 text-destructive text-xs font-medium">
                              <TrendingDown className="h-3 w-3" /> LOSS
                            </span>
                          )}
                          {trade.is_win === null && (
                            <span className="text-muted-foreground text-xs">PENDING</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

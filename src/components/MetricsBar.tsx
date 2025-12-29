import { TrendingUp, Trophy, Shield, Flame, Lock } from 'lucide-react';
import { EngineState } from '@/types/deriv';
import { cn } from '@/lib/utils';

interface MetricsBarProps {
  state: EngineState;
}

export function MetricsBar({ state }: MetricsBarProps) {
  const metrics = [
    {
      label: 'Total Profit',
      value: `${state.totalProfit >= 0 ? '+' : ''}$${state.totalProfit.toFixed(2)}`,
      icon: TrendingUp,
      color: state.totalProfit >= 0 ? 'text-success' : 'text-destructive',
      glow: state.totalProfit >= 0 ? 'text-glow-success' : 'text-glow-danger',
    },
    {
      label: 'Win Rate',
      value: `${state.winRate.toFixed(1)}%`,
      subtext: `Goal: 85%`,
      icon: Trophy,
      color: state.winRate >= 85 ? 'text-success' : state.winRate >= 70 ? 'text-warning' : 'text-destructive',
      glow: state.winRate >= 85 ? 'text-glow-success' : '',
    },
    {
      label: 'Vault Balance',
      value: `$${state.vaultBalance.toFixed(2)}`,
      icon: Lock,
      color: 'text-vault',
      glow: 'text-glow-vault',
    },
    {
      label: 'Win Streak',
      value: state.winStreak.toString(),
      icon: Flame,
      color: state.winStreak >= 5 ? 'text-accent' : 'text-foreground',
      glow: state.winStreak >= 5 ? 'text-glow-vault' : '',
    },
    {
      label: 'Protected Floor',
      value: `$${state.protectedFloor.toFixed(2)}`,
      icon: Shield,
      color: 'text-primary',
      glow: 'text-glow-primary',
    },
  ];

  return (
    <header className="h-20 bg-card border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-8">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg bg-muted/50",
              metric.color
            )}>
              <metric.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {metric.label}
              </p>
              <p className={cn(
                "text-lg font-bold font-mono",
                metric.color,
                metric.glow
              )}>
                {metric.value}
              </p>
              {metric.subtext && (
                <p className="text-[10px] text-muted-foreground">{metric.subtext}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Account Balance
          </p>
          <p className="text-xl font-bold font-mono text-foreground">
            {state.currency} {state.balance.toFixed(2)}
          </p>
        </div>
        <div className={cn(
          "w-3 h-3 rounded-full",
          state.isRunning ? "bg-success animate-pulse" : "bg-muted"
        )} />
      </div>
    </header>
  );
}

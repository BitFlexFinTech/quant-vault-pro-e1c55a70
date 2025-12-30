import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Play, Square, AlertOctagon, Zap, BarChart3, Key, Shield, Save } from 'lucide-react';
import { EngineState, EngineSettings } from '@/types/deriv';
import { cn } from '@/lib/utils';

interface ControlPanelProps {
  state: EngineState;
  settings: EngineSettings;
  apiToken: string;
  onStart: () => void;
  onStop: () => void;
  onPanic: () => void;
  onUpdateSettings: (settings: Partial<EngineSettings>) => void;
  onUpdateProtectedFloor: (value: number) => void;
  onUpdateApiToken: (token: string) => void;
}

export function ControlPanel({
  state,
  settings,
  apiToken,
  onStart,
  onStop,
  onPanic,
  onUpdateSettings,
  onUpdateProtectedFloor,
  onUpdateApiToken,
}: ControlPanelProps) {
  const [showApiInput, setShowApiInput] = useState(false);
  const [tempToken, setTempToken] = useState(apiToken);
  const [tempFloor, setTempFloor] = useState(state.protectedFloor.toString());

  const handleSaveToken = () => {
    if (tempToken.trim()) {
      onUpdateApiToken(tempToken.trim());
      setShowApiInput(false);
    }
  };

  const handleSaveFloor = () => {
    const value = parseFloat(tempFloor);
    if (!isNaN(value) && value >= 0) {
      onUpdateProtectedFloor(value);
    }
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-primary" />
          <h1 className="font-bold text-lg text-foreground">QUANT-BOT-PRO</h1>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className={cn(
            "w-2 h-2 rounded-full",
            state.isConnected ? "bg-success animate-pulse" : "bg-destructive"
          )} />
          {state.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
        </div>
      </div>

      <div className="p-4 space-y-4 border-b border-sidebar-border">
        <Button
          variant={state.isRunning ? "secondary" : "default"}
          className={cn(
            "w-full h-12 font-semibold transition-all",
            state.isRunning 
              ? "bg-secondary hover:bg-secondary/80" 
              : "bg-primary text-primary-foreground hover:bg-primary/90 animate-glow"
          )}
          onClick={state.isRunning ? onStop : onStart}
        >
          {state.isRunning ? (
            <>
              <Square className="h-4 w-4 mr-2" />
              STOP ENGINE
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              START ENGINE
            </>
          )}
        </Button>

        <Button
          variant="destructive"
          className="w-full h-10 font-semibold"
          onClick={onPanic}
        >
          <AlertOctagon className="h-4 w-4 mr-2" />
          PANIC CLOSE
        </Button>

        <Link to="/analytics" className="w-full">
          <Button variant="outline" className="w-full h-10 font-semibold">
            <BarChart3 className="h-4 w-4 mr-2" />
            ANALYTICS
          </Button>
        </Link>

        <Button
          variant="outline"
          className="w-full h-10 font-semibold"
          onClick={() => setShowApiInput(!showApiInput)}
        >
          <Key className="h-4 w-4 mr-2" />
          API KEY
        </Button>

        {showApiInput && (
          <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border animate-slide-in">
            <Label className="text-xs text-muted-foreground">Deriv API Token</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={tempToken}
                onChange={(e) => setTempToken(e.target.value)}
                placeholder="Enter API token"
                className="h-8 text-xs font-mono bg-background"
              />
              <Button size="sm" className="h-8 px-2" onClick={handleSaveToken}>
                <Save className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {/* Protected Floor - Editable */}
        <div className="space-y-3 p-3 bg-vault/10 rounded-lg border border-vault/30">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-vault" />
            <Label className="text-xs text-vault uppercase tracking-wide font-semibold">
              Protected Floor
            </Label>
          </div>
          <div className="flex gap-2">
            <Input
              type="number"
              value={tempFloor}
              onChange={(e) => setTempFloor(e.target.value)}
              className="h-8 text-sm font-mono bg-background"
              step="0.01"
              min="0"
            />
            <Button size="sm" className="h-8 px-2" onClick={handleSaveFloor}>
              <Save className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Current: ${state.protectedFloor.toFixed(2)}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Profit Target
            </Label>
            <span className="text-sm font-mono text-foreground">
              ${settings.profitTarget.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[settings.profitTarget]}
            min={5}
            max={100}
            step={5}
            onValueChange={([value]) => onUpdateSettings({ profitTarget: value })}
            className="py-2"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Stake Amount
            </Label>
            <span className="text-sm font-mono text-foreground">
              ${settings.stake.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[settings.stake]}
            min={1}
            max={10}
            step={0.5}
            onValueChange={([value]) => onUpdateSettings({ stake: Math.max(1, value) })}
            className="py-2"
          />
          <p className="text-[10px] text-muted-foreground">Min: $1.00</p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Min Probability
            </Label>
            <span className="text-sm font-mono text-foreground">
              {settings.minProbability}%
            </span>
          </div>
          <Slider
            value={[settings.minProbability]}
            min={50}
            max={95}
            step={1}
            onValueChange={([value]) => onUpdateSettings({ minProbability: value })}
            className="py-2"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Vault Threshold
            </Label>
            <span className="text-sm font-mono text-foreground">
              ${settings.vaultThreshold.toFixed(2)}
            </span>
          </div>
          <Slider
            value={[settings.vaultThreshold]}
            min={1}
            max={10}
            step={0.5}
            onValueChange={([value]) => onUpdateSettings({ vaultThreshold: value })}
            className="py-2"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Position Size %
            </Label>
            <span className="text-sm font-mono text-foreground">
              {settings.positionSizePercent.toFixed(1)}%
            </span>
          </div>
          <Slider
            value={[settings.positionSizePercent]}
            min={1}
            max={10}
            step={0.5}
            onValueChange={([value]) => onUpdateSettings({ positionSizePercent: value })}
            className="py-2"
          />
        </div>
      </div>

      <div className="p-4 border-t border-sidebar-border bg-sidebar/50">
        <div className="text-[10px] text-muted-foreground text-center">
          v1.0.0 | HFT Engine Active
        </div>
      </div>
    </aside>
  );
}

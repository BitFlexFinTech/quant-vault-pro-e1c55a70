import { useDerivEngine } from '@/hooks/useDerivEngine';
import { ControlPanel } from '@/components/ControlPanel';
import { MetricsBar } from '@/components/MetricsBar';
import { TradingChart } from '@/components/TradingChart';
import { AssetStats } from '@/components/AssetStats';
import { ActivePositions } from '@/components/ActivePositions';
import { ActivityTerminal } from '@/components/ActivityTerminal';

const Index = () => {
  const {
    state,
    settings,
    assets,
    currentSignal,
    activeTrades,
    tradeHistory,
    logs,
    apiToken,
    start,
    stop,
    panicClose,
    updateSettings,
    updateProtectedFloor,
    updateApiToken,
    closeTrade,
  } = useDerivEngine();

  return (
    <div className="min-h-screen bg-background flex">
      <ControlPanel
        state={state}
        settings={settings}
        apiToken={apiToken}
        onStart={start}
        onStop={stop}
        onPanic={panicClose}
        onUpdateSettings={updateSettings}
        onUpdateProtectedFloor={updateProtectedFloor}
        onUpdateApiToken={updateApiToken}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <MetricsBar state={state} />

        <main className="flex-1 p-6 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <div className="space-y-6">
              <TradingChart
                tradeHistory={tradeHistory}
                totalProfit={state.totalProfit}
              />
            </div>

            <div className="space-y-6">
              <AssetStats assets={assets} tradeHistory={tradeHistory} />
              <ActivePositions
                activeTrades={activeTrades}
                currentSignal={currentSignal}
                onCloseTrade={closeTrade}
              />
            </div>
          </div>
        </main>
      </div>

      <ActivityTerminal logs={logs} />
    </div>
  );
};

export default Index;

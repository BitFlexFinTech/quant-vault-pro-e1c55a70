import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DerivResponse,
  AuthorizeResponse,
  ActiveSymbolsResponse,
  ProposalResponse,
  BuyResponse,
  ProposalOpenContractResponse,
  TradingAsset,
  TradeSignal,
  TradeExecution,
  EngineState,
  EngineSettings,
  ActivityLog,
  LogType,
} from '@/types/deriv';

const WS_URL = 'wss://ws.binaryws.com/websockets/v3?app_id=1089';
const AUTH_TOKEN = 'bwQm6CfYuKyOduN';
const TRADE_INTERVAL = 2500;
const TARGET_WIN_RATE = 85;

const VOLATILITY_SYMBOLS = [
  'R_10', 'R_25', 'R_50', 'R_75', 'R_100',
  'BOOM300N', 'BOOM500N', 'BOOM1000N',
  'CRASH300N', 'CRASH500N', 'CRASH1000N',
  '1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V',
];

export function useDerivEngine() {
  const wsRef = useRef<WebSocket | null>(null);
  const reqIdRef = useRef(1);
  const tradeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pendingContractsRef = useRef<Map<number, TradeExecution>>(new Map());

  const [state, setState] = useState<EngineState>({
    isRunning: false,
    isConnected: false,
    balance: 0,
    currency: 'USDT',
    protectedFloor: 30.03,
    vaultBalance: 0,
    totalProfit: 0,
    winRate: 0,
    winStreak: 0,
    totalTrades: 0,
    wins: 0,
    losses: 0,
    minProbability: 85,
  });

  const [settings, setSettings] = useState<EngineSettings>({
    profitTarget: 10,
    stake: 1.00,
    minProbability: 85,
    vaultThreshold: 1.00,
    positionSizePercent: 2.5,
  });

  const [assets, setAssets] = useState<TradingAsset[]>([]);
  const [currentSignal, setCurrentSignal] = useState<TradeSignal | null>(null);
  const [activeTrades, setActiveTrades] = useState<TradeExecution[]>([]);
  const [tradeHistory, setTradeHistory] = useState<TradeExecution[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const addLog = useCallback((type: LogType, message: string) => {
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date(),
    };
    setLogs(prev => [log, ...prev].slice(0, 100));
  }, []);

  const getNextReqId = useCallback(() => {
    return reqIdRef.current++;
  }, []);

  const send = useCallback((payload: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message = { ...payload, req_id: getNextReqId() };
      wsRef.current.send(JSON.stringify(message));
    }
  }, [getNextReqId]);

  const loadSystemSettings = useCallback(async () => {
    const { data: floorData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'current_protected_floor')
      .maybeSingle();

    const { data: probData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'min_probability')
      .maybeSingle();

    const { data: vaultData } = await supabase
      .from('vault_locks')
      .select('amount');

    const vaultTotal = vaultData?.reduce((sum, v) => sum + Number(v.amount), 0) || 0;

    setState(prev => ({
      ...prev,
      protectedFloor: floorData ? parseFloat(floorData.setting_value) : 30.03,
      minProbability: probData ? parseFloat(probData.setting_value) : 85,
      vaultBalance: vaultTotal,
    }));

    if (probData) {
      setSettings(prev => ({
        ...prev,
        minProbability: parseFloat(probData.setting_value),
      }));
    }
  }, []);

  const handleMessage = useCallback((event: MessageEvent) => {
    const data: DerivResponse = JSON.parse(event.data);

    if (data.error) {
      addLog('ERR', `API Error: ${(data.error as { message: string }).message}`);
      return;
    }

    switch (data.msg_type) {
      case 'authorize': {
        const authData = data as AuthorizeResponse;
        const { balance, currency } = authData.authorize;
        setState(prev => ({
          ...prev,
          isConnected: true,
          balance,
          currency,
        }));
        addLog('SYS', `Authorized: ${authData.authorize.loginid} | Balance: ${currency} ${balance.toFixed(2)}`);
        
        send({ active_symbols: 'brief', product_type: 'basic' });
        break;
      }

      case 'active_symbols': {
        const symbolsData = data as ActiveSymbolsResponse;
        const validAssets = symbolsData.active_symbols
          .filter(s => VOLATILITY_SYMBOLS.some(v => s.symbol.includes(v) || v.includes(s.symbol)))
          .filter(s => s.exchange_is_open === 1)
          .map(s => ({
            symbol: s.symbol,
            displayName: s.display_name,
            market: s.market_display_name,
            isOpen: s.exchange_is_open === 1,
          }));
        setAssets(validAssets);
        addLog('SYS', `Loaded ${validAssets.length} tradeable assets`);
        break;
      }

      case 'proposal': {
        const proposalData = data as ProposalResponse;
        addLog('SIG', `Proposal received: ${proposalData.proposal.display_value} | Payout: ${proposalData.proposal.payout}`);
        break;
      }

      case 'buy': {
        const buyData = data as BuyResponse;
        const contractId = buyData.buy.contract_id;
        
        addLog('TRD', `Contract purchased: #${contractId} | Cost: ${buyData.buy.buy_price.toFixed(2)}`);
        
        send({
          proposal_open_contract: 1,
          contract_id: contractId,
          subscribe: 1,
        });
        break;
      }

      case 'proposal_open_contract': {
        const pocData = data as ProposalOpenContractResponse;
        const contract = pocData.proposal_open_contract;
        
        if (contract.is_sold === 1 || contract.is_expired === 1) {
          const isWin = contract.profit > 0;
          const profit = contract.profit;
          
          handleTradeResult(contract.contract_id, profit, isWin, contract.currency);
        }
        break;
      }

      case 'balance': {
        const balanceData = data as DerivResponse & { balance: { balance: number; currency: string } };
        setState(prev => ({
          ...prev,
          balance: balanceData.balance.balance,
          currency: balanceData.balance.currency,
        }));
        break;
      }
    }
  }, [addLog, send]);

  const handleTradeResult = useCallback(async (contractId: number, profit: number, isWin: boolean, currency: string) => {
    const trade = pendingContractsRef.current.get(contractId);
    if (!trade) return;

    pendingContractsRef.current.delete(contractId);

    const completedTrade: TradeExecution = {
      ...trade,
      profit,
      isWin,
      status: isWin ? 'won' : 'lost',
    };

    setActiveTrades(prev => prev.filter(t => t.contractId !== contractId));
    setTradeHistory(prev => [completedTrade, ...prev].slice(0, 50));

    await supabase.from('trade_history').insert({
      symbol: trade.symbol,
      contract_type: trade.contractType,
      stake: trade.stake,
      profit,
      is_win: isWin,
      currency,
    });

    setState(prev => {
      const newWins = isWin ? prev.wins + 1 : prev.wins;
      const newLosses = isWin ? prev.losses : prev.losses + 1;
      const newTotal = prev.totalTrades + 1;
      const newWinRate = newTotal > 0 ? (newWins / newTotal) * 100 : 0;
      const newStreak = isWin ? prev.winStreak + 1 : 0;
      const newProfit = prev.totalProfit + profit;

      return {
        ...prev,
        wins: newWins,
        losses: newLosses,
        totalTrades: newTotal,
        winRate: newWinRate,
        winStreak: newStreak,
        totalProfit: newProfit,
      };
    });

    if (isWin) {
      addLog('TRD', `WIN: +${profit.toFixed(2)} ${currency} | Contract #${contractId}`);
      
      if (profit >= settings.vaultThreshold) {
        await lockToVault(settings.vaultThreshold);
      }
    } else {
      addLog('TRD', `LOSS: ${profit.toFixed(2)} ${currency} | Contract #${contractId}`);
      
      setState(prev => {
        if (prev.winRate < TARGET_WIN_RATE) {
          const newMinProb = Math.min(prev.minProbability + 2, 95);
          updateMinProbability(newMinProb);
          addLog('SYS', `AI Adjustment: Min Probability increased to ${newMinProb}%`);
          return { ...prev, minProbability: newMinProb };
        }
        return prev;
      });
    }
  }, [addLog, settings.vaultThreshold]);

  const lockToVault = useCallback(async (amount: number) => {
    await supabase.from('vault_locks').insert({ amount });

    const { data } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'current_protected_floor')
      .maybeSingle();

    const currentFloor = data ? parseFloat(data.setting_value) : 30.03;
    const newFloor = currentFloor + amount;

    await supabase
      .from('system_settings')
      .update({ setting_value: newFloor.toString() })
      .eq('setting_key', 'current_protected_floor');

    setState(prev => ({
      ...prev,
      vaultBalance: prev.vaultBalance + amount,
      protectedFloor: newFloor,
    }));

    addLog('VLT', `Vault Lock: +$${amount.toFixed(2)} | New Floor: $${newFloor.toFixed(2)}`);
  }, [addLog]);

  const updateMinProbability = useCallback(async (value: number) => {
    await supabase
      .from('system_settings')
      .update({ setting_value: value.toString() })
      .eq('setting_key', 'min_probability');
  }, []);

  const generateSignal = useCallback((): TradeSignal | null => {
    if (assets.length === 0) return null;

    const openAssets = assets.filter(a => a.isOpen);
    if (openAssets.length === 0) return null;

    const asset = openAssets[Math.floor(Math.random() * openAssets.length)];
    const direction = Math.random() > 0.5 ? 'CALL' : 'PUT';
    const probability = 80 + Math.random() * 15;

    return {
      symbol: asset.symbol,
      direction,
      probability,
      timestamp: Date.now(),
    };
  }, [assets]);

  const canTrade = useCallback((stake: number): boolean => {
    const availableBalance = state.balance - stake;
    return availableBalance >= state.protectedFloor;
  }, [state.balance, state.protectedFloor]);

  const executeTrade = useCallback(() => {
    if (!state.isConnected || !state.isRunning) return;

    const signal = generateSignal();
    if (!signal) {
      addLog('SYS', 'No valid trading signals available');
      return;
    }

    setCurrentSignal(signal);

    if (signal.probability < state.minProbability) {
      addLog('SIG', `Signal rejected: ${signal.probability.toFixed(1)}% < ${state.minProbability}% threshold`);
      return;
    }

    const stake = Math.max(settings.stake, 1.00);

    if (!canTrade(stake)) {
      addLog('ERR', `Trade blocked: Balance ${state.balance.toFixed(2)} - Stake ${stake.toFixed(2)} < Floor ${state.protectedFloor.toFixed(2)}`);
      return;
    }

    addLog('SIG', `Signal: ${signal.symbol} ${signal.direction} @ ${signal.probability.toFixed(1)}% confidence`);

    const contractType = signal.direction === 'CALL' ? 'CALL' : 'PUT';

    send({
      buy: 1,
      price: stake,
      parameters: {
        amount: stake,
        basis: 'stake',
        contract_type: contractType,
        currency: state.currency,
        duration: 5,
        duration_unit: 't',
        symbol: signal.symbol,
      },
    });

    const trade: TradeExecution = {
      id: crypto.randomUUID(),
      symbol: signal.symbol,
      contractType,
      stake,
      profit: null,
      isWin: null,
      currency: state.currency,
      timestamp: new Date(),
      status: 'pending',
    };

    setActiveTrades(prev => [...prev, trade]);
  }, [state, settings.stake, generateSignal, canTrade, addLog, send]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    addLog('SYS', 'Connecting to Deriv WebSocket...');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      addLog('SYS', 'WebSocket connected. Authorizing...');
      ws.send(JSON.stringify({ authorize: AUTH_TOKEN, req_id: getNextReqId() }));
    };

    ws.onmessage = handleMessage;

    ws.onerror = () => {
      addLog('ERR', 'WebSocket error occurred');
    };

    ws.onclose = () => {
      setState(prev => ({ ...prev, isConnected: false }));
      addLog('SYS', 'WebSocket disconnected');
    };

    wsRef.current = ws;
  }, [addLog, handleMessage, getNextReqId]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (!state.isConnected) {
      connect();
    }

    setState(prev => ({ ...prev, isRunning: true }));
    addLog('SYS', 'Trading engine STARTED');

    send({ balance: 1, subscribe: 1 });

    tradeIntervalRef.current = setInterval(executeTrade, TRADE_INTERVAL);
  }, [state.isConnected, connect, addLog, send, executeTrade]);

  const stop = useCallback(() => {
    setState(prev => ({ ...prev, isRunning: false }));
    
    if (tradeIntervalRef.current) {
      clearInterval(tradeIntervalRef.current);
      tradeIntervalRef.current = null;
    }

    addLog('SYS', 'Trading engine STOPPED');
  }, [addLog]);

  const panicClose = useCallback(() => {
    stop();
    disconnect();
    addLog('ERR', 'PANIC CLOSE: All operations terminated');
  }, [stop, disconnect, addLog]);

  const updateSettings = useCallback((newSettings: Partial<EngineSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (updated.stake < 1) updated.stake = 1;
      if (updated.minProbability < 50) updated.minProbability = 50;
      if (updated.minProbability > 95) updated.minProbability = 95;
      return updated;
    });
  }, []);

  useEffect(() => {
    loadSystemSettings();
    connect();

    return () => {
      if (tradeIntervalRef.current) {
        clearInterval(tradeIntervalRef.current);
      }
      disconnect();
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('trade-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'trade_history' }, () => {
        loadSystemSettings();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'vault_locks' }, () => {
        loadSystemSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSystemSettings]);

  return {
    state,
    settings,
    assets,
    currentSignal,
    activeTrades,
    tradeHistory,
    logs,
    start,
    stop,
    panicClose,
    updateSettings,
    connect,
    disconnect,
  };
}

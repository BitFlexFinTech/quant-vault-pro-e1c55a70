export interface DerivResponse {
  echo_req: { req_id: number; [key: string]: unknown };
  msg_type: string;
  req_id: number;
  [key: string]: unknown;
}

export interface AuthorizeResponse extends DerivResponse {
  msg_type: 'authorize';
  authorize: {
    account_list: Array<{
      account_type: string;
      currency: string;
      is_disabled: number;
      is_virtual: number;
      loginid: string;
    }>;
    balance: number;
    country: string;
    currency: string;
    email: string;
    fullname: string;
    is_virtual: number;
    landing_company_fullname: string;
    landing_company_name: string;
    loginid: string;
    user_id: number;
  };
}

export interface TickResponse extends DerivResponse {
  msg_type: 'tick';
  tick: {
    ask: number;
    bid: number;
    epoch: number;
    id: string;
    pip_size: number;
    quote: number;
    symbol: string;
  };
}

export interface ProposalResponse extends DerivResponse {
  msg_type: 'proposal';
  proposal: {
    ask_price: number;
    date_expiry: number;
    date_start: number;
    display_value: string;
    id: string;
    longcode: string;
    payout: number;
    spot: number;
    spot_time: number;
  };
}

export interface BuyResponse extends DerivResponse {
  msg_type: 'buy';
  buy: {
    balance_after: number;
    buy_price: number;
    contract_id: number;
    longcode: string;
    payout: number;
    purchase_time: number;
    shortcode: string;
    start_time: number;
    transaction_id: number;
  };
}

export interface ProposalOpenContractResponse extends DerivResponse {
  msg_type: 'proposal_open_contract';
  proposal_open_contract: {
    account_id: number;
    barrier: string;
    barrier_count: number;
    bid_price: number;
    buy_price: number;
    contract_id: number;
    contract_type: string;
    currency: string;
    current_spot: number;
    current_spot_display_value: string;
    current_spot_time: number;
    date_expiry: number;
    date_settlement: number;
    date_start: number;
    display_name: string;
    entry_spot: number;
    entry_spot_display_value: string;
    entry_tick: number;
    entry_tick_display_value: string;
    entry_tick_time: number;
    exit_tick?: number;
    exit_tick_display_value?: string;
    exit_tick_time?: number;
    expiry_time: number;
    id: string;
    is_expired: number;
    is_forward_starting: number;
    is_intraday: number;
    is_path_dependent: number;
    is_settleable: number;
    is_sold: number;
    is_valid_to_cancel: number;
    is_valid_to_sell: number;
    longcode: string;
    payout: number;
    profit: number;
    profit_percentage: number;
    purchase_time: number;
    sell_price?: number;
    sell_spot?: number;
    sell_spot_display_value?: string;
    sell_spot_time?: number;
    sell_time?: number;
    shortcode: string;
    status: 'open' | 'sold' | 'won' | 'lost';
    transaction_ids: {
      buy: number;
      sell?: number;
    };
    underlying: string;
    validation_error?: string;
  };
}

export interface ActiveSymbolsResponse extends DerivResponse {
  msg_type: 'active_symbols';
  active_symbols: Array<{
    allow_forward_starting: number;
    display_name: string;
    display_order: number;
    exchange_is_open: number;
    is_trading_suspended: number;
    market: string;
    market_display_name: string;
    pip: number;
    subgroup: string;
    subgroup_display_name: string;
    submarket: string;
    submarket_display_name: string;
    symbol: string;
    symbol_type: string;
  }>;
}

export interface TradingAsset {
  symbol: string;
  displayName: string;
  market: string;
  isOpen: boolean;
}

export interface TradeSignal {
  symbol: string;
  direction: 'CALL' | 'PUT';
  probability: number;
  timestamp: number;
}

export interface TradeExecution {
  id: string;
  symbol: string;
  contractType: string;
  stake: number;
  profit: number | null;
  isWin: boolean | null;
  currency: string;
  timestamp: Date;
  status: 'pending' | 'active' | 'won' | 'lost';
  contractId?: number;
}

export interface EngineState {
  isRunning: boolean;
  isConnected: boolean;
  balance: number;
  currency: string;
  protectedFloor: number;
  vaultBalance: number;
  totalProfit: number;
  winRate: number;
  winStreak: number;
  totalTrades: number;
  wins: number;
  losses: number;
  minProbability: number;
}

export interface EngineSettings {
  profitTarget: number;
  stake: number;
  minProbability: number;
  vaultThreshold: number;
  positionSizePercent: number;
}

export type LogType = 'SYS' | 'SIG' | 'TRD' | 'VLT' | 'ERR';

export interface ActivityLog {
  id: string;
  type: LogType;
  message: string;
  timestamp: Date;
}

// types/huntSession.ts
export interface PlayerData {
  name: string;
  loot: number;
  supplies: number;
  balance: number;
  damage: number;
  healing: number;
  isLeader?: boolean;
}

export interface SessionData {
  startDate: string;
  endDate: string;
  duration: string;
  lootType: 'Leader' | 'Market' | 'Split';
  totalLoot: number;
  totalSupplies: number;
  totalBalance: number;
  players: PlayerData[];
}

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}
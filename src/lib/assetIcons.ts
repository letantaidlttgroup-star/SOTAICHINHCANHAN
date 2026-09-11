import { Home, TrendingUp, Bitcoin, Coins, Gem, Sparkles, Banknote, Landmark, Box } from 'lucide-react';
import type { AssetClass } from '../db/db';

export const ASSET_ICON: Record<AssetClass, typeof Home> = {
  realEstate: Home, stock: TrendingUp, crypto: Bitcoin, preciousMetal: Coins,
  gemstone: Gem, jewelry: Sparkles, cash: Banknote, bankAccount: Landmark, other: Box,
};

export const ASSET_COLOR: Record<AssetClass, string> = {
  realEstate: '#6E8FB0', stock: '#4FB286', crypto: '#C98A5A', preciousMetal: '#C9A96A',
  gemstone: '#A98FC9', jewelry: '#C98AA8', cash: '#8A8F98', bankAccount: '#7E93A8', other: '#9C9287',
};

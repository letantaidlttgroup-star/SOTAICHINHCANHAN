import { Wallet, Landmark, Smartphone, PiggyBank } from 'lucide-react';
import type { WalletType } from '../db/db';

export const WALLET_ICON: Record<WalletType, typeof Wallet> = {
  cash: Wallet, bank: Landmark, ewallet: Smartphone, savings: PiggyBank, other: Wallet,
};

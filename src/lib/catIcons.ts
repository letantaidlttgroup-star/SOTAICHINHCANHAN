import {
  Utensils, Coffee, Car, ShoppingBag, Receipt, Shield, Landmark,
  Sparkles, Tag, HeartPulse, Plus, ArrowLeftRight,
} from 'lucide-react';

export const CAT_ICON: Record<string, typeof Tag> = {
  utensils: Utensils, coffee: Coffee, car: Car, 'shopping-bag': ShoppingBag,
  receipt: Receipt, shield: Shield, landmark: Landmark, sparkles: Sparkles,
  'heart-pulse': HeartPulse, tag: Tag, plus: Plus, 'arrow-left-right': ArrowLeftRight,
};
export const catIcon = (name?: string) => (name && CAT_ICON[name]) || Tag;

import { CurrencyConverter, ValuationService } from '../db/valuation';

export const converter = new CurrencyConverter();
export const valuation = new ValuationService(converter);

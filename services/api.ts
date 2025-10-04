export type Country = {
  name: {
    common: string;
    official: string;
  };
  currencies: {
    [key: string]: {
      name: string;
      symbol: string;
    };
  };
};

export async function fetchCountriesAndCurrencies(): Promise<Country[]> {
  const response = await fetch('https://restcountries.com/v3.1/all?fields=name,currencies');
  if (!response.ok) throw new Error('Failed to fetch countries');
  return response.json();
}

export async function fetchExchangeRates(baseCurrency: string): Promise<{
  base: string;
  rates: { [key: string]: number };
}> {
  const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
  if (!response.ok) throw new Error('Failed to fetch exchange rates');
  return response.json();
}

export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  const data = await fetchExchangeRates(fromCurrency);
  const rate = data.rates[toCurrency];

  if (!rate) throw new Error(`Exchange rate not found for ${toCurrency}`);

  return amount * rate;
}

export async function simulateOCR(file: File): Promise<{
  amount: number;
  currency: string;
  category: string;
  description: string;
  date: string;
  merchant: string;
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        amount: Math.floor(Math.random() * 500) + 10,
        currency: 'USD',
        category: ['Travel', 'Food', 'Supplies', 'Entertainment'][Math.floor(Math.random() * 4)],
        description: 'Auto-generated from receipt',
        date: new Date().toISOString().split('T')[0],
        merchant: 'Sample Merchant',
      });
    }, 2000);
  });
}

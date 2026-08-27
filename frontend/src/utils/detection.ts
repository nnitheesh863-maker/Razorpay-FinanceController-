import type { Transaction } from '../context/LedgerlyContext';

export interface SuggestedPattern {
  merchant: string;
  category: string;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  occurrenceCount: number;
  confidence: 'High' | 'Likely';
  averageAmount: number;
  monthlyEquivalent: number;
  nextExpectedDate: string;
  isSubscription: boolean;
  rawMerchantName: string;
}

/**
 * Normalizes merchant names to enable robust rule/recurring matching
 */
export const normalizeMerchant = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // remove punctuation
    .replace(/#\d+/g, '') // remove terminal # plus numbers
    .replace(/\d{4,}/g, '') // remove sequences of 4+ digits (e.g. ref numbers)
    .replace(/\s+/g, ' '); // collapse whitespace
};

const SUB_HINTS = [
  'netflix', 'spotify', 'hulu', 'disney', 'youtube', 'icloud', 'dropbox', 
  'adobe', 'microsoft', 'amazon prime', 'patreon', 'membership', 'studio', 
  'gym', 'openai', 'chatgpt', 'canva', 'notion', 'zoom', 'slack', 'github'
];

const BILL_HINTS = [
  'mortgage', 'rent', 'loan', 'insurance', 'utility', 'utilities', 'electric', 
  'water', 'internet', 'phone', 'mobile', 'daycare', 'tuition', 'lease', 
  'car payment', 'auto payment', 'hoa', 'property tax'
];

export const detectPatterns = (transactions: Transaction[], ignoredList: string[] = []): SuggestedPattern[] => {
  const expenses = transactions.filter(t => t.type === 'expense');
  const groups: Record<string, Transaction[]> = {};

  // Group by normalized merchant
  expenses.forEach(tx => {
    const norm = normalizeMerchant(tx.merchant);
    if (!norm) return;
    if (!groups[norm]) {
      groups[norm] = [];
    }
    groups[norm].push(tx);
  });

  const suggestions: SuggestedPattern[] = [];

  Object.entries(groups).forEach(([normMerchant, txs]) => {
    // Skip if in the user's dismissed/ignored suggestions list
    if (ignoredList.includes(normMerchant)) return;

    // Require at least two unique transaction dates
    if (txs.length < 2) return;

    // Sort by date ascending
    const sortedTxs = [...txs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Calculate intervals
    const intervals: number[] = [];
    for (let i = 1; i < sortedTxs.length; i++) {
      const diffTime = new Date(sortedTxs[i].date).getTime() - new Date(sortedTxs[i - 1].date).getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      intervals.push(diffDays);
    }

    // Find dominant interval (average or median)
    const avgInterval = intervals.reduce((s, val) => s + val, 0) / intervals.length;
    
    // Classify interval cadence
    let cadence: SuggestedPattern['cadence'] | null = null;
    if (avgInterval >= 5 && avgInterval <= 9) cadence = 'weekly';
    else if (avgInterval >= 12 && avgInterval <= 17) cadence = 'biweekly';
    else if (avgInterval >= 24 && avgInterval <= 40) cadence = 'monthly';
    else if (avgInterval >= 75 && avgInterval <= 110) cadence = 'quarterly';
    else if (avgInterval >= 330 && avgInterval <= 400) cadence = 'annual';

    if (!cadence) return; // not periodic within thresholds

    // Calculate amounts variation
    const amounts = sortedTxs.map(t => t.amount);
    const avgAmount = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variances = amounts.map(a => Math.abs(a - avgAmount) / avgAmount);
    const avgVariance = variances.reduce((s, v) => s + v, 0) / variances.length;

    // Identify category & tag clues
    const hasSubClue = sortedTxs.some(t => 
      t.category.toLowerCase().includes('subscription') || 
      JSON.parse(t.tags || '[]').some((tag: string) => tag.toLowerCase().includes('subscription')) ||
      SUB_HINTS.some(h => normMerchant.includes(h))
    );

    const hasBillClue = sortedTxs.some(t => 
      t.category.toLowerCase().includes('utility') || 
      t.category.toLowerCase().includes('bill') || 
      BILL_HINTS.some(h => normMerchant.includes(h))
    );

    // Apply amount variation limits
    const maxVariation = hasSubClue ? 0.20 : 0.35;
    if (avgAmount > 0 && avgVariance > maxVariation) return; // unstable amounts

    // Protection against false positives: no hints requires >= 3 stable occurrences and <= 3% variance
    if (!hasSubClue && !hasBillClue) {
      if (sortedTxs.length < 3) return; // reject small logs
      if (avgVariance > 0.03) return;   // reject noisy groceries
      if (cadence === 'weekly') return; // reject weekly routine runs
    }

    // Determine confidence
    let confidence: SuggestedPattern['confidence'] = 'Likely';
    const intervalJitter = intervals.map(days => {
      let expected = 30;
      if (cadence === 'weekly') expected = 7;
      if (cadence === 'biweekly') expected = 14;
      if (cadence === 'quarterly') expected = 90;
      if (cadence === 'annual') expected = 365;
      return Math.abs(days - expected);
    });
    const avgJitter = intervalJitter.reduce((s, j) => s + j, 0) / intervalJitter.length;

    if (sortedTxs.length >= 3 && avgVariance <= 0.12 && avgJitter <= 5) {
      confidence = 'High';
    }

    // Calculate monthly equivalent amount
    let monthlyEquivalent = avgAmount;
    if (cadence === 'weekly') monthlyEquivalent = (avgAmount * 52) / 12;
    else if (cadence === 'biweekly') monthlyEquivalent = (avgAmount * 26) / 12;
    else if (cadence === 'quarterly') monthlyEquivalent = avgAmount / 3;
    else if (cadence === 'annual') monthlyEquivalent = avgAmount / 12;

    // Estimate next occurrence date
    const lastTx = sortedTxs[sortedTxs.length - 1];
    const lastDate = new Date(lastTx.date);
    const nextDate = new Date(lastDate);
    if (cadence === 'weekly') nextDate.setDate(lastDate.getDate() + 7);
    else if (cadence === 'biweekly') nextDate.setDate(lastDate.getDate() + 14);
    else if (cadence === 'monthly') nextDate.setMonth(lastDate.getMonth() + 1);
    else if (cadence === 'quarterly') nextDate.setMonth(lastDate.getMonth() + 3);
    else if (cadence === 'annual') nextDate.setFullYear(lastDate.getFullYear() + 1);

    const isSubscription = hasSubClue || (!hasBillClue && categoryDataClue(sortedTxs, 'subscription'));

    suggestions.push({
      merchant: normMerchant,
      category: lastTx.category,
      cadence,
      occurrenceCount: sortedTxs.length,
      confidence,
      averageAmount: avgAmount,
      monthlyEquivalent,
      nextExpectedDate: nextDate.toISOString().split('T')[0],
      isSubscription,
      rawMerchantName: lastTx.merchant // display display name
    });
  });

  return suggestions;
};

const categoryDataClue = (txs: Transaction[], keyword: string): boolean => {
  return txs.some(t => t.category.toLowerCase().includes(keyword));
};

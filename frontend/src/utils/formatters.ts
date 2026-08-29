/**
 * Format a number as Indian Rupees (INR) with full precision.
 * e.g. 2806415.99 → ₹28,06,415.99
 */
export const formatCurrency = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Format a number as compact INR (Lakhs / Crores).
 * e.g. 2806415.99 → ₹28.06L
 * e.g. 12000000 → ₹1.20Cr
 */
export const formatCurrencyCompact = (value: number): string => {
  if (value === null || value === undefined || isNaN(value)) return '₹0';
  const abs = Math.abs(value);
  if (abs >= 10_000_000) {
    return `₹${(value / 10_000_000).toFixed(2)}Cr`;
  }
  if (abs >= 100_000) {
    return `₹${(value / 100_000).toFixed(2)}L`;
  }
  if (abs >= 1_000) {
    return `₹${(value / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(value);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

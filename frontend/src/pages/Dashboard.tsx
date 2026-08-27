import { useLedgerly } from '../context/LedgerlyContext';
import type { Transaction } from '../context/LedgerlyContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock, 
  ArrowRight,
  HelpCircle,
  PiggyBank,
  CheckCircle2
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

export default function Dashboard() {
  const { transactions, settings, updatePreferences, loading } = useLedgerly();

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#6558D3] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const selectedPeriod = settings.selectedPeriod || 'all-time';

  const handlePeriodChange = async (period: string) => {
    try {
      await updatePreferences({ selectedPeriod: period });
    } catch (err) {
      console.error(err);
    }
  };

  // 1. Filter transactions by selected date range
  const filterTransactions = (txs: Transaction[], period: string) => {
    if (period === 'all-time') return txs;
    const now = new Date();
    const start = new Date();
    
    if (period === 'this-month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (period === 'last-month') {
      start.setMonth(now.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return txs.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
      });
    } else if (period === 'last-3-months') {
      start.setMonth(now.getMonth() - 3);
    } else if (period === 'last-6-months') {
      start.setMonth(now.getMonth() - 6);
    } else if (period === 'this-year') {
      start.setMonth(0);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }
    
    return txs.filter(t => new Date(t.date) >= start);
  };

  const filteredTxs = filterTransactions(transactions, selectedPeriod);

  // 2. Calculations
  const incomeTxs = filteredTxs.filter(t => t.type === 'income');
  const expenseTxs = filteredTxs.filter(t => t.type === 'expense');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalSpending = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

  // Savings rate formula: ((income - spending) / income) * 100
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalSpending) / totalIncome) * 100 : 0;

  // 3. Cash Flow Chart Data (last 7 monthly buckets)
  const buildCashFlowData = () => {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthLabel = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();

      const bucketTxs = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getFullYear() === year && td.getMonth() === month;
      });

      const inc = bucketTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const exp = bucketTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      data.push({
        name: monthLabel,
        Income: inc,
        Expense: exp
      });
    }
    return data;
  };

  const cashFlowData = buildCashFlowData();

  // 4. Category Breakdown Data
  const buildCategoryData = () => {
    const map: Record<string, number> = {};
    expenseTxs.forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.keys(map).map(cat => ({
      name: cat,
      value: map[cat]
    })).sort((a, b) => b.value - a.value);
  };

  const categoryData = buildCategoryData();
  const COLORS = ['#6558D3', '#FFA500', '#00A86B', '#1E90FF', '#FF4500', '#DA70D6', '#98FB98'];

  // Factual Insights: count of Needs review transactions
  const needsReviewCount = transactions.filter(t => t.category === 'Needs review').length;

  // Next upcoming recurring item
  const upcomingBills = settings.recurring?.filter(r => r.active).slice(0, 3) || [];

  return (
    <div className="space-y-6 text-left">
      
      {/* Period Selection Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
        <span className="text-xs font-bold text-gray-500">Date Range Filter</span>
        <div className="flex flex-wrap gap-1 bg-gray-100/60 p-1 rounded-xl">
          {[
            { label: 'All time', value: 'all-time' },
            { label: 'This Month', value: 'this-month' },
            { label: 'Last Month', value: 'last-month' },
            { label: 'Last 3 Mths', value: 'last-3-months' },
            { label: 'Last 6 Mths', value: 'last-6-months' },
            { label: 'This Year', value: 'this-year' },
          ].map((period) => (
            <button
              key={period.value}
              onClick={() => handlePeriodChange(period.value)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold tracking-tight transition-all cursor-pointer ${
                selectedPeriod === period.value
                  ? 'bg-white text-[#6558D3] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Net Worth */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Net Worth</span>
            {settings.netWorthConfigured ? (
              <span className="text-xl font-extrabold text-gray-900 mt-1 block">
                {formatCurrency(settings.assetsTotal - settings.liabilitiesTotal)}
              </span>
            ) : (
              <div className="mt-1.5">
                <span className="text-xs font-extrabold text-amber-600 block">Not set</span>
                <span className="text-[10px] text-gray-400 font-semibold block leading-tight mt-0.5">Configure in Settings</span>
              </div>
            )}
          </div>
          <div className="text-[10px] text-gray-400 font-semibold border-t border-gray-50 pt-2 mt-2">
            Assets minus Liabilities
          </div>
        </div>

        {/* KPI 2: Income */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Income</span>
            <span className="text-xl font-extrabold text-green-600 mt- block">
              {formatCurrency(totalIncome)}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 font-semibold border-t border-gray-50 pt-2 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-green-500" />
            <span>Total earned in period</span>
          </div>
        </div>

        {/* KPI 3: Spending */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Spending</span>
            <span className="text-xl font-extrabold text-orange-600 mt-1 block">
              {formatCurrency(totalSpending)}
            </span>
          </div>
          <div className="text-[10px] text-gray-400 font-semibold border-t border-gray-50 pt-2 mt-2 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-orange-500" />
            <span>Total spent in period</span>
          </div>
        </div>

        {/* KPI 4: Savings Rate */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between min-h-[120px]">
          <div>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Savings Rate</span>
            <span className={`text-xl font-extrabold mt-1 block ${savingsRate >= 15 ? 'text-green-600' : 'text-blue-600'}`}>
              {savingsRate.toFixed(1)}%
            </span>
          </div>
          <div className="text-[10px] text-gray-400 font-semibold border-t border-gray-50 pt-2 mt-2 flex items-center gap-1">
            <PiggyBank className="w-3.5 h-3.5 text-blue-500" />
            <span>Target: &gt;15.0%</span>
          </div>
        </div>

      </div>

      {/* Main Charts & Dashboard Data Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cash Flow Area Chart (2/3 width on wide screens) */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Cash Flow Trends</h3>
            <p className="text-[10px] text-gray-400 font-semibold">Monthly income vs expense breakdown</p>
          </div>

          {transactions.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-4 bg-gray-50 rounded-xl">
              <HelpCircle className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-xs font-bold text-gray-500">Import or add transactions to see cash flow.</p>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00A86B" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#00A86B" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6558D3" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6558D3" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#a0a0a0" fontSize={9} fontWeight="bold" tickLine={false} />
                  <YAxis stroke="#a0a0a0" fontSize={9} fontWeight="bold" tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #f0f0f0', fontSize: '11px', fontFamily: 'monospace' }}
                    formatter={(value) => [formatCurrency(Number(value))]}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="Income" stroke="#00A86B" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                  <Area type="monotone" dataKey="Expense" stroke="#6558D3" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Expense Category breakdown (1/3 width) */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Spending by Category</h3>
            <p className="text-[10px] text-gray-400 font-semibold">Expense share for the filtered period</p>
          </div>

          {categoryData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-4 bg-gray-50 rounded-xl">
              <HelpCircle className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-xs font-bold text-gray-500">No expense records found.</p>
            </div>
          ) : (
            <div className="h-64 relative flex flex-col justify-center">
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value))]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[90px] text-[10px] font-bold text-gray-500 pl-2 space-y-1.5 scrollbar-thin">
                {categoryData.slice(0, 4).map((entry, index) => (
                  <div key={entry.name} className="flex justify-between items-center pr-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="truncate max-w-[120px]">{entry.name}</span>
                    </div>
                    <span className="text-gray-900">{formatCurrency(entry.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Bottom Grid: Recent Activity & Insight blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Transactions List (2/3 width) */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-gray-900">Recent Activity</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Five newest transactions in period</p>
            </div>
            <a href="/transactions" className="text-[11px] font-extrabold text-[#6558D3] hover:underline flex items-center gap-1">
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Merchant</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTxs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-400 font-semibold">No recent transactions.</td>
                  </tr>
                ) : (
                  filteredTxs.slice(0, 5).map(t => (
                    <tr key={t.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-[10px] font-mono text-gray-400">{formatDate(t.date)}</td>
                      <td className="px-4 py-3 font-bold text-gray-800 truncate max-w-[150px]">{t.merchant}</td>
                      <td className="px-4 py-3">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-extrabold">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-semibold">{t.account}</td>
                      <td className={`px-4 py-3 text-right font-extrabold ${t.type === 'income' ? 'text-green-600' : 'text-gray-900'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Factual insights & Upcoming commitments (1/3 width) */}
        <div className="space-y-6">
          
          {/* Insights Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-3.5">
            <div>
              <h3 className="text-xs font-bold text-gray-900">Ledgerly Insights</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Key focal points and exceptions</p>
            </div>
            
            {needsReviewCount > 0 ? (
              <div className="p-3.5 bg-amber-50 text-amber-800 border border-amber-100 rounded-xl text-xs font-bold flex items-start gap-2.5">
                <AlertTriangle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex flex-col text-left">
                  <span>Review Pending</span>
                  <span className="text-[10px] font-medium text-amber-700/80 leading-snug mt-0.5">
                    {needsReviewCount} transaction{needsReviewCount > 1 ? 's are' : ' is'} categorised as 'Needs review'. Update categories in Transactions.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-green-50 text-green-800 border border-green-100 rounded-xl text-xs font-bold flex items-center gap-2.5">
                <CheckCircle2 className="w-4.5 h-4.5 text-green-600" />
                <div className="flex flex-col text-left">
                  <span>Up to Date!</span>
                  <span className="text-[10px] font-medium text-green-700/80 leading-snug mt-0.5">
                    All transactions have been classified. Zero items in review.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Coming up Card */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-3.5">
            <div>
              <h3 className="text-xs font-bold text-gray-900">Coming Up</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Next recurring bills or payments</p>
            </div>
            
            {upcomingBills.length === 0 ? (
              <div className="p-3.5 bg-gray-50 rounded-xl text-center text-[11px] font-bold text-gray-400">
                No upcoming payments. Link one in Recurring.
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {upcomingBills.map(b => (
                  <div key={b.id} className="flex justify-between items-center py-2.5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <div className="flex flex-col text-left">
                        <span className="text-xs font-bold text-gray-800">{b.name}</span>
                        <span className="text-[10px] text-gray-400 font-medium">{formatDate(b.nextDate)} ({b.cadence})</span>
                      </div>
                    </div>
                    <span className="text-xs font-extrabold text-gray-900">{formatCurrency(b.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}

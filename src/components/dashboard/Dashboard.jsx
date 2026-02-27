import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { supabase } from '../../supabaseClient';

function Dashboard({ user }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all | income | expense | deleted

  const [type, setType] = useState('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    id: '',
    type: 'expense',
    amount: '',
    category: '',
    note: '',
    txn_date: new Date().toISOString().slice(0, 10),
  });
  const [editError, setEditError] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [chartMode, setChartMode] = useState('monthly'); // 'monthly' | 'yearly'
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1); // 1-12
  const [overviewYear, setOverviewYear] = useState(() => new Date().getFullYear());
  const [overviewMonth, setOverviewMonth] = useState(() => new Date().getMonth() + 1); // 1-12

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
  };

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_v, i) =>
        new Date(2000, i, 1).toLocaleString('en', { month: 'long' })
      ),
    []
  );

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      setError('');
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('txn_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message || 'Failed to load transactions.');
      } else {
        setTransactions(data || []);
      }

      setLoading(false);
    };

    fetchTransactions();
  }, [user.id]);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    setError('');

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    if (!date) {
      setError('Please select a date.');
      return;
    }

    setSubmitting(true);
    const { data, error: insertError } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: user.id,
          type,
          amount: numericAmount,
          category: category || (type === 'income' ? 'General income' : 'General expense'),
          note,
          txn_date: date,
        },
      ])
      .select()
      .single();

    if (insertError) {
      setError(insertError.message || 'Failed to add transaction.');
    } else if (data) {
      setTransactions((prev) => [data, ...prev]);
      setAmount('');
      setNote('');
    }

    setSubmitting(false);
  };

  const openEditModal = (txn) => {
    setEditForm({
      id: txn.id,
      type: txn.type,
      amount: String(txn.amount),
      category: txn.category || '',
      note: txn.note || '',
      txn_date: txn.txn_date,
    });
    setEditError('');
    setIsEditOpen(true);
  };

  const closeEditModal = () => {
    setIsEditOpen(false);
    setEditSubmitting(false);
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleUpdateTransaction = async (e) => {
    e.preventDefault();
    setEditError('');

    const numericAmount = Number(editForm.amount);
    if (!numericAmount || numericAmount <= 0) {
      setEditError('Amount must be a positive number.');
      return;
    }

    if (!editForm.txn_date) {
      setEditError('Please select a date.');
      return;
    }

    setEditSubmitting(true);
    const { data, error: updateError } = await supabase
      .from('transactions')
      .update({
        type: editForm.type,
        amount: numericAmount,
        category:
          editForm.category || (editForm.type === 'income' ? 'General income' : 'General expense'),
        note: editForm.note,
        txn_date: editForm.txn_date,
      })
      .eq('id', editForm.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      setEditError(updateError.message || 'Failed to update transaction.');
      setEditSubmitting(false);
      return;
    }

    if (data) {
      setTransactions((prev) => prev.map((txn) => (txn.id === data.id ? data : txn)));
    }

    closeEditModal();
  };

  const handleDeleteTransaction = async (id) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this transaction?\n\nIt will be moved to the Deleted tab and no longer counted in your totals.'
    );
    if (!confirmed) return;

    const previous = transactions;
    const deletedAt = new Date().toISOString();

    // Optimistic update: mark as deleted locally
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, deleted_at: deletedAt } : t))
    );

    const { error: deleteError } = await supabase
      .from('transactions')
      .update({ deleted_at: deletedAt })
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) {
      // revert optimistic update
      setTransactions(previous);
      setError(deleteError.message || 'Failed to delete transaction.');
    }
  };

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const filteredTransactions = transactions
    // scope table to the selected Overview month/year
    .filter((t) => {
      if (!t.txn_date) return false;
      const d = new Date(t.txn_date);
      return d.getFullYear() === overviewYear && d.getMonth() + 1 === overviewMonth;
    })
    // then apply Deleted vs non-deleted filter
    .filter((t) => (filter === 'deleted' ? Boolean(t.deleted_at) : !t.deleted_at))
    // and apply type filter
    .filter((t) => (filter === 'all' || filter === 'deleted' ? true : t.type === filter));

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const dateA = new Date(a.txn_date).getTime();
    const dateB = new Date(b.txn_date).getTime();
    if (dateA !== dateB) return dateB - dateA; // latest first
    const createdA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createdB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return createdB - createdA;
  });

  const overviewYearsAvailable = useMemo(() => {
    const years = new Set([currentYear]);
    transactions
      .filter((t) => !t.deleted_at)
      .forEach((t) => {
        if (!t.txn_date) return;
        const y = new Date(t.txn_date).getFullYear();
        if (y <= currentYear) years.add(y);
      });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, currentYear]);

  useEffect(() => {
    if (!overviewYearsAvailable.includes(overviewYear)) {
      setOverviewYear(overviewYearsAvailable[0]);
    }
  }, [overviewYearsAvailable, overviewYear]);

  const monthlyTotals = useMemo(() => {
    return transactions
      .filter((t) => !t.deleted_at)
      .filter((t) => {
        if (!t.txn_date) return false;
        const d = new Date(t.txn_date);
        return d.getFullYear() === overviewYear && d.getMonth() + 1 === overviewMonth;
      })
      .reduce(
        (acc, t) => {
          if (t.type === 'income') {
            acc.income += Number(t.amount) || 0;
          } else if (t.type === 'expense') {
            acc.expense += Number(t.amount) || 0;
          }
          return acc;
        },
        { income: 0, expense: 0 }
      );
  }, [transactions, overviewYear, overviewMonth]);

  const monthlyBalance = monthlyTotals.income - monthlyTotals.expense;

  const openingBalance = useMemo(() => {
    const cutoff = new Date(overviewYear, overviewMonth - 1, 1); // start of selected month
    return transactions
      .filter((t) => !t.deleted_at)
      .filter((t) => {
        if (!t.txn_date) return false;
        const d = new Date(t.txn_date);
        return d.getTime() < cutoff.getTime();
      })
      .reduce((acc, t) => {
        if (t.type === 'income') acc += Number(t.amount) || 0;
        if (t.type === 'expense') acc -= Number(t.amount) || 0;
        return acc;
      }, 0);
  }, [transactions, overviewYear, overviewMonth]);

  const expenseTransactions = useMemo(
    () => transactions.filter((t) => !t.deleted_at && t.type === 'expense'),
    [transactions]
  );

  const yearsAvailable = useMemo(() => {
    const years = new Set();
    expenseTransactions.forEach((t) => {
      if (t.txn_date) {
        years.add(new Date(t.txn_date).getFullYear());
      }
    });
    const sorted = Array.from(years).sort((a, b) => b - a);
    return sorted.length > 0 ? sorted : [new Date().getFullYear()];
  }, [expenseTransactions]);

  useEffect(() => {
    if (!yearsAvailable.includes(selectedYear)) {
      setSelectedYear(yearsAvailable[0]);
    }
  }, [yearsAvailable, selectedYear]);

  const monthlyLineData = useMemo(() => {
    const base = Array.from({ length: 12 }, (_v, i) => ({
      monthIndex: i + 1,
      name: new Date(2000, i, 1).toLocaleString('en', { month: 'short' }),
      total: 0,
    }));

    expenseTransactions.forEach((t) => {
      if (!t.txn_date) return;
      const d = new Date(t.txn_date);
      const year = d.getFullYear();
      if (year !== selectedYear) return;
      const monthIndex = d.getMonth(); // 0-based
      base[monthIndex].total += Number(t.amount) || 0;
    });

    return base;
  }, [expenseTransactions, selectedYear]);

  const yearlyLineData = useMemo(() => {
    const map = new Map();
    expenseTransactions.forEach((t) => {
      if (!t.txn_date) return;
      const year = new Date(t.txn_date).getFullYear();
      const prev = map.get(year) || 0;
      map.set(year, prev + (Number(t.amount) || 0));
    });
    const arr = Array.from(map.entries())
      .map(([year, total]) => ({ year, total }))
      .sort((a, b) => a.year - b.year);
    return arr;
  }, [expenseTransactions]);

  const categoryPieData = useMemo(() => {
    const map = new Map();
    expenseTransactions.forEach((t) => {
      if (!t.txn_date) return;
      const d = new Date(t.txn_date);
      const yr = d.getFullYear();
      const m = d.getMonth() + 1;

      if (chartMode === 'monthly') {
        if (yr !== selectedYear || m !== selectedMonth) return;
      } else if (chartMode === 'yearly') {
        if (yr !== selectedYear) return;
      }

      const key = t.category || 'Uncategorized';
      const prev = map.get(key) || 0;
      map.set(key, prev + (Number(t.amount) || 0));
    });

    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [expenseTransactions, chartMode, selectedYear, selectedMonth]);

  const pieColors = ['#38bdf8', '#22c55e', '#f97316', '#a855f7', '#eab308', '#f97373', '#0ea5e9'];

  return (
    <main className="tw-main">
      <section className="tw-grid">
        <div className="tw-card tw-card--full">
          <h2>Add transaction</h2>
          <form className="tw-form tw-form--inline" onSubmit={handleAddTransaction}>
            <div className="tw-form-row">
              <label className="tw-field">
                <span>Type</span>
                <select value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>

              <label className="tw-field">
                <span>Amount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </label>

              <label className="tw-field">
                <span>Date</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
            </div>

            <div className="tw-form-row">
              <label className="tw-field">
                <span>Category</span>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={type === 'income' ? 'Salary, bonus, etc.' : 'Food, rent, etc.'}
                />
              </label>

              <label className="tw-field tw-field--grow">
                <span>Note (optional)</span>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a short description"
                />
              </label>
            </div>

            {error && <div className="tw-alert tw-alert--error">{error}</div>}

            <div className="tw-form-actions">
              <button
                className="tw-button tw-button--primary"
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Add transaction'}
              </button>
            </div>
          </form>
        </div>

        <div className="tw-card tw-card--summary">
          <div className="flex items-center justify-between gap-4">
            <h2>Overview</h2>
            <div className="flex items-center gap-3">
              <div className="hidden sm:inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50/90 px-3 py-1 text-xs text-emerald-800">
                <span className="text-slate-500">Opening</span>
                <span className={openingBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                  ₹{openingBalance.toFixed(2)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  className="tw-select-inline"
                  value={overviewYear}
                  onChange={(e) => {
                    const nextYear = Number(e.target.value);
                    const maxMonth = nextYear === currentYear ? currentMonth : 12;
                    setOverviewYear(nextYear);
                    setOverviewMonth((prev) => Math.min(prev, maxMonth));
                  }}
                  aria-label="Select year"
                >
                  {overviewYearsAvailable.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>

                <select
                  className="tw-select-inline"
                  value={overviewMonth}
                  onChange={(e) => setOverviewMonth(Number(e.target.value))}
                  aria-label="Select month"
                >
                  {(() => {
                    const maxMonth = overviewYear === currentYear ? currentMonth : 12;
                    const monthsDesc = Array.from({ length: maxMonth }, (_v, i) => maxMonth - i);
                    return monthsDesc.map((m) => (
                      <option key={`${overviewYear}-${m}`} value={m}>
                        {monthNames[m - 1]}
                      </option>
                    ));
                  })()}
                </select>
              </div>
            </div>
          </div>
          <div className="tw-summary-grid">
            <div className="tw-summary-item">
              <span className="tw-summary-label">Total income</span>
              <span className="tw-summary-value tw-summary-value--income">
                ₹{monthlyTotals.income.toFixed(2)}
              </span>
            </div>
            <div className="tw-summary-item">
              <span className="tw-summary-label">Total expenses</span>
              <span className="tw-summary-value tw-summary-value--expense">
                ₹{monthlyTotals.expense.toFixed(2)}
              </span>
            </div>
            <div className="tw-summary-item">
              <span className="tw-summary-label">Current balance</span>
              <span
                className={
                  'tw-summary-value ' +
                  (monthlyBalance >= 0
                    ? 'tw-summary-value--positive'
                    : 'tw-summary-value--negative')
                }
              >
                ₹{monthlyBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="tw-card tw-card--full tw-card--table">
        <div className="tw-card-header tw-card-header--with-controls">
          <div>
            <h2>Transactions</h2>
            <p>
              {loading
                ? 'Loading your transactions...'
                : filteredTransactions.length === 0
                ? 'No transactions found.'
                : `Showing ${filteredTransactions.length} transaction(s) for ${monthNames[overviewMonth - 1]} ${overviewYear}.`}
            </p>
          </div>
          <div className="tw-filter-group">
            <button
              className={
                'tw-chip' + (filter === 'all' ? ' tw-chip--active tw-chip--all' : '')
              }
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={
                'tw-chip' + (filter === 'income' ? ' tw-chip--active tw-chip--income' : '')
              }
              onClick={() => setFilter('income')}
            >
              Income
            </button>
            <button
              className={
                'tw-chip' +
                (filter === 'expense' ? ' tw-chip--active tw-chip--expense' : '')
              }
              onClick={() => setFilter('expense')}
            >
              Expenses
            </button>
            <button
              className={
                'tw-chip' +
                (filter === 'deleted' ? ' tw-chip--active tw-chip--deleted' : '')
              }
              onClick={() => setFilter('deleted')}
            >
              Deleted
            </button>
          </div>
        </div>

        <div className="tw-table-wrapper tw-table-wrapper--transactions">
          <table className="tw-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Category</th>
                <th>Note</th>
                <th className="tw-text-right">Amount</th>
                <th className="tw-text-right">Edit</th>
                <th className="tw-text-right">Delete</th>
              </tr>
            </thead>
            <tbody>
              {!loading && sortedTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="tw-empty-row">
                    No transactions found.
                  </td>
                </tr>
              )}

              {sortedTransactions.map((t) => (
                <tr key={t.id}>
                  <td>{formatDate(t.txn_date)}</td>
                  <td>
                    <span
                      className={
                        'tw-badge ' +
                        (t.type === 'income' ? 'tw-badge--income' : 'tw-badge--expense')
                      }
                    >
                      {t.type === 'income' ? 'Income' : 'Expense'}
                    </span>
                  </td>
                  <td>{t.category}</td>
                  <td>{t.note}</td>
                  <td className="tw-text-right tw-table-amount">
                    <span
                      className={
                        t.type === 'income'
                          ? 'tw-amount tw-amount--income'
                          : 'tw-amount tw-amount--expense'
                      }
                    >
                      {t.type === 'income' ? '+' : '-'}₹
                      {Number(t.amount).toFixed(2)}
                    </span>
                  </td>
                  <td className="tw-text-right">
                    <button
                      className="tw-icon-button tw-icon-button--edit"
                      onClick={() => openEditModal(t)}
                      title="Edit transaction"
                    >
                      ✎
                    </button>
                  </td>
                  <td className="tw-text-right">
                    <button
                      className="tw-icon-button"
                      onClick={() => handleDeleteTransaction(t.id)}
                      title="Delete transaction"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="tw-card tw-card--full tw-card--charts">
        <div className="tw-card-header tw-card-header--with-controls">
          <div>
            <h2>Spending insights</h2>
            <p>Visualize your expenses by month, year and category.</p>
          </div>
          <div className="tw-charts-controls">
            <div className="tw-filter-group">
              <button
                className={
                  'tw-chip' + (chartMode === 'monthly' ? ' tw-chip--active tw-chip--all' : '')
                }
                onClick={() => setChartMode('monthly')}
              >
                Monthly
              </button>
              <button
                className={
                  'tw-chip' + (chartMode === 'yearly' ? ' tw-chip--active tw-chip--income' : '')
                }
                onClick={() => setChartMode('yearly')}
              >
                Yearly
              </button>
            </div>
            <div className="tw-charts-selects">
              <select
                className="tw-select-inline"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {yearsAvailable.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              {chartMode === 'monthly' && (
                <select
                  className="tw-select-inline"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_v, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2000, m - 1, 1).toLocaleString('en', { month: 'short' })}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="tw-charts-grid">
          <div className="tw-chart-card">
            <h3 className="tw-chart-title">
              {chartMode === 'monthly'
                ? `Monthly expenses in ${selectedYear}`
                : 'Yearly expenses'}
            </h3>
            <div className="tw-chart-inner">
              <ResponsiveContainer width="100%" height="100%">
                {chartMode === 'monthly' ? (
                  <LineChart
                    data={monthlyLineData}
                    margin={{ top: 5, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Expenses']}
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.98)',
                        borderColor: 'rgba(148,163,184,0.55)',
                        color: '#0f172a',
                      }}
                      labelStyle={{ color: '#475569' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#38bdf8"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                ) : (
                  <LineChart
                    data={yearlyLineData}
                    margin={{ top: 5, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="year" stroke="#9ca3af" />
                    <YAxis stroke="#9ca3af" tickFormatter={(v) => `₹${v}`} />
                    <Tooltip
                      formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Expenses']}
                      contentStyle={{
                        backgroundColor: 'rgba(255,255,255,0.98)',
                        borderColor: 'rgba(148,163,184,0.55)',
                        color: '#0f172a',
                      }}
                      labelStyle={{ color: '#475569' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="tw-chart-card">
            <h3 className="tw-chart-title">
              {chartMode === 'monthly'
                ? `Category-wise expenses (${new Date(2000, selectedMonth - 1, 1).toLocaleString(
                    'en',
                    { month: 'short' }
                  )} ${selectedYear})`
                : `Category-wise expenses (${selectedYear})`}
            </h3>
            <div className="tw-chart-inner tw-chart-inner--pie">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryPieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={chartMode === 'yearly' ? 60 : 80}
                    fill="#38bdf8"
                    label={false}
                    labelLine={false}
                  >
                    {categoryPieData.map((entry, index) => (
                      <Cell
                        key={`slice-${entry.name}-${index}`}
                        fill={pieColors[index % pieColors.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      `₹${Number(value).toFixed(2)} spent`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.98)',
                      borderColor: 'rgba(148,163,184,0.55)',
                      color: '#0f172a',
                    }}
                    labelStyle={{ color: '#475569' }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Legend
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    wrapperStyle={{
                      color: '#0f172a',
                      fontSize: 11,
                      paddingTop: 8,
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'center',
                      maxHeight: 72,
                      overflowY: 'auto',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      {isEditOpen && (
        <div className="tw-modal-backdrop" role="dialog" aria-modal="true">
          <div className="tw-modal">
            <div className="tw-modal-header">
              <h3>Edit transaction</h3>
              <button className="tw-icon-button" onClick={closeEditModal} title="Close">
                ✕
              </button>
            </div>

            <form className="tw-form" onSubmit={handleUpdateTransaction}>
              <div className="tw-form-row">
                <label className="tw-field">
                  <span>Type</span>
                  <select
                    value={editForm.type}
                    onChange={(e) => handleEditFieldChange('type', e.target.value)}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>

                <label className="tw-field">
                  <span>Amount</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.amount}
                    onChange={(e) => handleEditFieldChange('amount', e.target.value)}
                  />
                </label>

                <label className="tw-field">
                  <span>Date</span>
                  <input
                    type="date"
                    value={editForm.txn_date}
                    onChange={(e) => handleEditFieldChange('txn_date', e.target.value)}
                  />
                </label>
              </div>

              <div className="tw-form-row">
                <label className="tw-field">
                  <span>Category</span>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => handleEditFieldChange('category', e.target.value)}
                  />
                </label>

                <label className="tw-field tw-field--grow">
                  <span>Note</span>
                  <input
                    type="text"
                    value={editForm.note}
                    onChange={(e) => handleEditFieldChange('note', e.target.value)}
                  />
                </label>
              </div>

              {editError && <div className="tw-alert tw-alert--error">{editError}</div>}

              <div className="tw-form-actions tw-form-actions--gap">
                <button
                  type="button"
                  className="tw-button tw-button--ghost"
                  onClick={closeEditModal}
                >
                  Cancel
                </button>
                <button
                  className="tw-button tw-button--primary"
                  type="submit"
                  disabled={editSubmitting}
                >
                  {editSubmitting ? 'Updating...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Dashboard;



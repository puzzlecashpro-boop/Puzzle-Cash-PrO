import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router';
import { ArrowLeft, CheckCircle, XCircle, RefreshCw, Loader2, Shield, AlertTriangle, Gift } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';

const ADMIN_EMAIL = 'puzzlecashpro@gmail.com';

interface DepositRequest {
  id: number;
  user_id: string;
  email: string;
  amount: number;
  upi_ref: string;
  status: string;
  created_at: string;
}

interface WithdrawalRequest {
  id: number;
  user_id: string;
  email: string;
  amount: number;
  upi_id: string;
  status: string;
  created_at: string;
}

interface ReferralLog {
  id: number;
  referrer_email: string;
  referred_email: string;
  referral_code: string;
  bonus_credited: number;
  bonus_amount: number;
  credited_at: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, isPending } = useAuth();
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [referrals, setReferrals] = useState<ReferralLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin
  const isAdmin = user?.email?.toLowerCase().trim() === ADMIN_EMAIL;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [depositsRes, withdrawalsRes, referralsRes] = await Promise.all([
        fetch('/api/admin/pending-deposits'),
        fetch('/api/admin/pending-withdrawals'),
        fetch('/api/admin/referrals'),
      ]);

      if (!depositsRes.ok || !withdrawalsRes.ok) {
        throw new Error('Failed to fetch data from server');
      }

      const depositsData = await depositsRes.json();
      const withdrawalsData = await withdrawalsRes.json();
      const referralsData = referralsRes.ok ? await referralsRes.json() : { referrals: [] };

      // Safely set data with fallbacks
      setDeposits(Array.isArray(depositsData?.deposits) ? depositsData.deposits : []);
      setWithdrawals(Array.isArray(withdrawalsData?.withdrawals) ? withdrawalsData.withdrawals : []);
      setReferrals(Array.isArray(referralsData?.referrals) ? referralsData.referrals : []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Failed to load data. Please try refreshing.');
      setDeposits([]);
      setWithdrawals([]);
      setReferrals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on mount - MUST be before any conditional returns
  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin, fetchData]);

  const handleDepositAction = async (id: number, action: 'approve' | 'reject') => {
    setProcessingId(`deposit-${id}-${action}`);

    try {
      const res = await fetch(`/api/admin/deposits/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        setDeposits(prev => (prev || []).filter(d => d.id !== id));
      } else {
        console.error('Failed to process deposit');
      }
    } catch (error) {
      console.error('Error processing deposit:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleWithdrawalAction = async (id: number, action: 'approve' | 'reject') => {
    // For approve, prompt admin for Payout UTR
    if (action === 'approve') {
      const payoutUtr = window.prompt('Enter Payout UTR / Transaction Reference:');
      if (!payoutUtr || payoutUtr.trim().length < 6) {
        alert('Payout UTR is required (minimum 6 characters)');
        return;
      }
      
      setProcessingId(`withdrawal-${id}-${action}`);
      
      try {
        const res = await fetch(`/api/admin/withdrawals/${id}/approve`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ payoutUtr: payoutUtr.trim() }),
        });
        if (res.ok) {
          setWithdrawals(prev => (prev || []).filter(w => w.id !== id));
        } else {
          const data = await res.json();
          alert('Failed: ' + (data.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Error processing withdrawal:', error);
        alert('Network error processing withdrawal');
      } finally {
        setProcessingId(null);
      }
      return;
    }

    // For reject
    setProcessingId(`withdrawal-${id}-${action}`);

    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/${action}`, { method: 'POST' });
      if (res.ok) {
        setWithdrawals(prev => (prev || []).filter(w => w.id !== id));
      } else {
        console.error('Failed to process withdrawal');
      }
    } catch (error) {
      console.error('Error processing withdrawal:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Unknown';
    }
  };

  // Show loading while checking auth
  if (isPending) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Redirect non-admin users to home
  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Header */}
      <header className="bg-[#12121a] border-b border-gray-800 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-cyan-400" />
              <h1 className="text-xl font-bold">Admin Control Panel</h1>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-8">
        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchData}
              className="ml-auto px-3 py-1 bg-red-500/30 hover:bg-red-500/40 rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Pending Deposits Section */}
        <section className="bg-[#12121a] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Pending Deposits
            </h2>
            <span className="text-sm text-gray-400">{deposits?.length || 0} request(s)</span>
          </div>

          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : !deposits || deposits.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No pending deposit requests
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50 text-sm text-gray-400">
                  <tr>
                    <th className="px-6 py-3 text-left">User</th>
                    <th className="px-6 py-3 text-left">Amount</th>
                    <th className="px-6 py-3 text-left">UPI Ref</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(deposits || []).map((deposit) => (
                    <tr key={deposit.id} className="hover:bg-gray-800/30">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{deposit.email || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">ID: {deposit.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-400 font-semibold">₹{deposit.amount || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-800 px-2 py-1 rounded">{deposit.upi_ref || 'N/A'}</code>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDate(deposit.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDepositAction(deposit.id, 'approve')}
                            disabled={processingId !== null}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 text-sm"
                          >
                            {processingId === `deposit-${deposit.id}-approve` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleDepositAction(deposit.id, 'reject')}
                            disabled={processingId !== null}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 text-sm"
                          >
                            {processingId === `deposit-${deposit.id}-reject` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pending Withdrawals Section */}
        <section className="bg-[#12121a] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pink-500"></span>
              Pending Withdrawals
            </h2>
            <span className="text-sm text-gray-400">{withdrawals?.length || 0} request(s)</span>
          </div>

          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : !withdrawals || withdrawals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No pending withdrawal requests
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50 text-sm text-gray-400">
                  <tr>
                    <th className="px-6 py-3 text-left">User</th>
                    <th className="px-6 py-3 text-left">Amount</th>
                    <th className="px-6 py-3 text-left">UPI ID</th>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(withdrawals || []).map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-800/30">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{withdrawal.email || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">ID: {withdrawal.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-pink-400 font-semibold">₹{withdrawal.amount || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-800 px-2 py-1 rounded">{withdrawal.upi_id || 'N/A'}</code>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDate(withdrawal.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleWithdrawalAction(withdrawal.id, 'approve')}
                            disabled={processingId !== null}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 text-sm"
                          >
                            {processingId === `withdrawal-${withdrawal.id}-approve` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleWithdrawalAction(withdrawal.id, 'reject')}
                            disabled={processingId !== null}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 text-sm"
                          >
                            {processingId === `withdrawal-${withdrawal.id}-reject` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Referrals Section */}
        <section className="bg-[#12121a] rounded-xl border border-gray-800 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Gift className="w-5 h-5 text-yellow-400" />
              Referral Logs
            </h2>
            <span className="text-sm text-gray-400">{referrals?.length || 0} referral(s)</span>
          </div>

          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
            </div>
          ) : !referrals || referrals.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No referrals yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/50 text-sm text-gray-400">
                  <tr>
                    <th className="px-6 py-3 text-left">Referrer</th>
                    <th className="px-6 py-3 text-left">Referred User</th>
                    <th className="px-6 py-3 text-left">Code</th>
                    <th className="px-6 py-3 text-center">Bonus Status</th>
                    <th className="px-6 py-3 text-left">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(referrals || []).map((ref) => (
                    <tr key={ref.id} className="hover:bg-gray-800/30">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium">{ref.referrer_email || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">{ref.referred_email || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-gray-800 px-2 py-1 rounded text-cyan-400">{ref.referral_code}</code>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {ref.bonus_credited ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                            <CheckCircle className="w-3 h-3" />
                            ₹{ref.bonus_amount} Credited
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                            Pending First Deposit
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDate(ref.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

{/* Info Note */}
        <div className="text-center text-sm text-gray-500 pb-4">
          <p>Approving a deposit adds funds to the user's wallet.</p>
          <p>Rejecting a withdrawal refunds the amount to the user.</p>
          <p className="text-cyan-400 mt-1">Approving a withdrawal requires Payout UTR entry.</p>
        </div>
      </main>
    </div>
  );
}

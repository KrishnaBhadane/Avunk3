import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserCredits, CreditTransaction } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface CreditContextType {
  credits: UserCredits;
  transactions: CreditTransaction[];
  loading: boolean;
  hasCredits: boolean;
  totalCredits: number;
  consumeCredit: (feature: string) => Promise<boolean>;
  refundCredit: (feature: string) => Promise<boolean>;
  refreshCredits: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export const CreditProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<UserCredits>({ free_credits: 0, paid_credits: 0 });
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const totalCredits = credits.free_credits + credits.paid_credits;
  const hasCredits = totalCredits > 0;

  // Fetch credits from Supabase
  const refreshCredits = useCallback(async () => {
    if (!user) {
      setCredits({ free_credits: 0, paid_credits: 0 });
      return;
    }

    const { data, error } = await supabase
      .from('credits')
      .select('free_credits, paid_credits')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      console.warn('Could not fetch credits:', error?.message);
      setCredits({ free_credits: 0, paid_credits: 0 });
      return;
    }

    setCredits({ free_credits: data.free_credits, paid_credits: data.paid_credits });
  }, [user]);

  // Fetch credit transaction history
  const refreshTransactions = useCallback(async () => {
    if (!user) {
      setTransactions([]);
      return;
    }

    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      setTransactions([]);
      return;
    }

    setTransactions(data as CreditTransaction[]);
  }, [user]);

  // Load credits when user changes
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([refreshCredits(), refreshTransactions()]).finally(() => setLoading(false));
    } else {
      setCredits({ free_credits: 0, paid_credits: 0 });
      setTransactions([]);
    }
  }, [user, refreshCredits, refreshTransactions]);

  // Consume 1 credit via server-side RPC (atomic)
  const consumeCredit = async (feature: string): Promise<boolean> => {
    if (!user) return false;

    const { data, error } = await supabase.rpc('consume_credit', {
      p_user_profile_id: user.id,
      p_feature: feature,
    });

    if (error) {
      console.error('Credit consumption error:', error.message);
      return false;
    }

    // data is the boolean returned by the function
    const consumed = data === true;

    if (consumed) {
      // Refresh credits from DB to get the real balance
      await refreshCredits();
      await refreshTransactions();
    }

    return consumed;
  };

  // Refund 1 credit via server-side RPC (on failure)
  const refundCredit = async (feature: string): Promise<boolean> => {
    if (!user) return false;

    const { data, error } = await supabase.rpc('refund_credit', {
      p_user_profile_id: user.id,
      p_feature: feature,
    });

    if (error) {
      console.error('Credit refund error:', error.message);
      return false;
    }

    const refunded = data === true;

    if (refunded) {
      await refreshCredits();
      await refreshTransactions();
    }

    return refunded;
  };

  return (
    <CreditContext.Provider
      value={{
        credits,
        transactions,
        loading,
        hasCredits,
        totalCredits,
        consumeCredit,
        refundCredit,
        refreshCredits,
        refreshTransactions,
      }}
    >
      {children}
    </CreditContext.Provider>
  );
};

export const useCredits = () => {
  const context = useContext(CreditContext);
  if (!context) throw new Error('useCredits must be used within CreditProvider');
  return context;
};

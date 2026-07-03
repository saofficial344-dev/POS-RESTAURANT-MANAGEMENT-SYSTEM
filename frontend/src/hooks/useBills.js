import { useState, useEffect, useCallback } from "react";
import API from "../services/api";

/**
 * Fetches bills from GET /api/bills and guarantees bills is always an array.
 *
 * Backend returns: { data: [...bills], pagination: {...} }
 * This hook handles all response shapes so callers never need to normalize.
 *
 * Options:
 *   limit          — max bills to fetch (default 200)
 *   autoRefresh    — poll on an interval (default true)
 *   refreshInterval — ms between polls (default 30 000)
 *
 * Returns: { bills, loading, error, refetch }
 *   bills   — always an array, never null/undefined
 *   loading — true only on the initial load (not subsequent polls)
 *   error   — string | null
 *   refetch — manual trigger (also resets error)
 */
export function useBills({ limit = 200, autoRefresh = true, refreshInterval = 30_000 } = {}) {
  const [bills, setBills]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchBills = useCallback(async () => {
    setError(null);
    try {
      const { data } = await API.get(`/bills?limit=${limit}`);
      // Backend paginates: { data: [...], pagination: {...} }
      // Guard against legacy raw-array responses too
      const list = Array.isArray(data)        ? data
                 : Array.isArray(data?.data)   ? data.data
                 : Array.isArray(data?.bills)  ? data.bills
                 : [];
      setBills(list);
    } catch (err) {
      console.error("useBills: fetch failed", err);
      setError(err.response?.data?.message || "Failed to load bills. Check your connection.");
    } finally {
      setLoading(false);   // only ever sets false; never flips back to true on polls
    }
  }, [limit]);

  useEffect(() => {
    fetchBills();
    if (autoRefresh) {
      const id = setInterval(fetchBills, refreshInterval);
      return () => clearInterval(id);
    }
  }, [fetchBills, autoRefresh, refreshInterval]);

  return { bills, loading, error, refetch: fetchBills };
}

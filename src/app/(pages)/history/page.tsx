'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/page-header';
import StatusBadge from '@/components/ui/status-badge';
import MatchIndicator from '@/components/ui/match-indicator';
import { BEVERAGE_TYPE_LABELS } from '@/lib/constants';

interface HistoryItem {
  id: string;
  createdAt: string;
  status: 'PENDING' | 'VERIFIED' | 'MANUALLY_REVIEWED';
  beverageType: string;
  brandName: string;
  classType: string;
  imageFilename: string;
  overallResult: string | null;
  processingTimeMs: number | null;
}

export default function HistoryPage() {
  const [applications, setApplications] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'VERIFIED' | 'MANUALLY_REVIEWED'>('all');

  const fetchHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      else params.set('status', 'VERIFIED,MANUALLY_REVIEWED');
      const res = await fetch(`/api/applications?${params}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setApplications(data.data);
    } catch {
      // silent fail for history
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchHistory();
  }, [fetchHistory]);

  const resultToMatchType = (result: string | null): 'MATCH' | 'MISMATCH' | 'PARTIAL' | 'NOT_FOUND' => {
    if (result === 'AUTO_PASS' || result === 'MANUAL_PASS') return 'MATCH';
    if (result === 'AUTO_FAIL' || result === 'MANUAL_FAIL') return 'MISMATCH';
    return 'NOT_FOUND';
  };

  const resultLabel = (result: string | null): string => {
    switch (result) {
      case 'AUTO_PASS': return 'Auto Pass';
      case 'AUTO_FAIL': return 'Auto Fail';
      case 'MANUAL_PASS': return 'Manual Pass';
      case 'MANUAL_FAIL': return 'Manual Fail';
      default: return 'Pending';
    }
  };

  return (
    <div>
      <PageHeader
        title="Verification History"
        description="Previously verified applications"
      />

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {([['all', 'All'], ['VERIFIED', 'Auto-Verified'], ['MANUALLY_REVIEWED', 'Manually Reviewed']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-1">No verified applications yet</h3>
          <p className="text-gray-500">Process applications from the queue to see results here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{app.brandName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{BEVERAGE_TYPE_LABELS[app.beverageType] || app.beverageType}</td>
                  <td className="px-6 py-4">
                    <MatchIndicator result={resultToMatchType(app.overallResult)} />
                    <span className="ml-2 text-xs text-gray-500">{resultLabel(app.overallResult)}</span>
                  </td>
                  <td className="px-6 py-4"><StatusBadge status={app.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {app.processingTimeMs ? `${(app.processingTimeMs / 1000).toFixed(1)}s` : '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/application/${app.id}`}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/page-header';
import Button from '@/components/ui/button';
import StatusBadge from '@/components/ui/status-badge';
import { useToast } from '@/components/ui/toast';
import { TableSkeleton } from '@/components/ui/skeleton';
import { api, ApiError } from '@/lib/api/client';
import { BEVERAGE_TYPE_LABELS } from '@/lib/constants';

interface QueueItem {
  id: string;
  createdAt: string;
  status: 'PENDING' | 'VERIFIED' | 'MANUALLY_REVIEWED';
  beverageType: string;
  brandName: string;
  classType: string;
  imageFilename: string;
  batchId: string | null;
}

interface VerifyResult {
  processed: number;
  failed: number;
  results: Array<{ id: string; overallResult: string; processingTimeMs: number }>;
  errors?: Array<{ id: string; error: string }>;
}

export default function QueuePage() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verifyProgress, setVerifyProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<'brandName' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchQueue = useCallback(async () => {
    try {
      const data = await api.get<{ data: QueueItem[] }>('/api/applications?status=PENDING');
      setApplications(data.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const sortedApplications = useMemo(() => {
    const sorted = [...applications];
    sorted.sort((a, b) => {
      if (sortField === 'brandName') {
        const cmp = a.brandName.localeCompare(b.brandName, undefined, { sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [applications, sortField, sortDir]);

  const handleSort = (field: 'brandName' | 'createdAt') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'brandName' ? 'asc' : 'desc');
    }
  };

  const handleVerifySingle = async (appId: string) => {
    try {
      const result = await api.post<VerifyResult>('/api/verify', { applicationIds: [appId] });
      if (result.processed > 0) {
        const r = result.results[0];
        toast(
          r.overallResult === 'AUTO_PASS' ? 'success' : 'info',
          `Verified: ${r.overallResult.replace('_', ' ')} (${(r.processingTimeMs / 1000).toFixed(1)}s)`
        );
      }
      if (result.failed > 0) {
        toast('error', `Verification failed: ${result.errors?.[0]?.error || 'Unknown error'}`);
      }
      await fetchQueue();
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Verification failed');
    }
  };

  const handleVerifyAll = async () => {
    setVerifying(true);
    setError(null);
    const total = applications.length;
    setVerifyProgress({ current: 0, total });

    let passed = 0;
    let failed = 0;

    // Process one at a time for progress tracking
    for (let i = 0; i < applications.length; i++) {
      setVerifyProgress({ current: i + 1, total });
      try {
        const result = await api.post<VerifyResult>('/api/verify', {
          applicationIds: [applications[i].id],
        });
        if (result.processed > 0 && result.results[0].overallResult === 'AUTO_PASS') {
          passed++;
        } else {
          failed++;
        }
        if (result.failed > 0) failed++;
      } catch {
        failed++;
      }
    }

    setVerifying(false);
    setVerifyProgress(null);
    toast('success', `Verification complete: ${passed} passed, ${failed} failed out of ${total}`);
    await fetchQueue();
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Verification Queue" description="Pending applications awaiting verification" />
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Verification Queue"
        description={`${applications.length} pending application${applications.length !== 1 ? 's' : ''}`}
        actions={
          applications.length > 0 ? (
            <Button onClick={handleVerifyAll} loading={verifying}>
              {verifyProgress
                ? `Verifying ${verifyProgress.current} of ${verifyProgress.total}...`
                : `Verify All (${applications.length})`}
            </Button>
          ) : undefined
        }
      />

      {/* Progress bar during verification */}
      {verifyProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Processing applications...</span>
            <span>{verifyProgress.current} / {verifyProgress.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(verifyProgress.current / verifyProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {applications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Queue is empty</h3>
          <p className="text-gray-500 mb-4">All applications have been processed.</p>
          <Link href="/submit">
            <Button variant="secondary">Submit New Application</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button type="button" onClick={() => handleSort('brandName')} className="inline-flex items-center gap-1 hover:text-gray-700">
                    Brand {sortField === 'brandName' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <button type="button" onClick={() => handleSort('createdAt')} className="inline-flex items-center gap-1 hover:text-gray-700">
                    Submitted {sortField === 'createdAt' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </button>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{app.brandName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{BEVERAGE_TYPE_LABELS[app.beverageType] || app.beverageType}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.classType}</td>
                  <td className="px-6 py-4"><StatusBadge status={app.status} /></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleVerifySingle(app.id)}
                      disabled={verifying}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium disabled:opacity-50"
                    >
                      Verify
                    </button>
                    <Link
                      href={`/application/${app.id}`}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      View
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

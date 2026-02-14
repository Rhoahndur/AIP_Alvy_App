'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/page-header';
import Button from '@/components/ui/button';
import StatusBadge from '@/components/ui/status-badge';
import MatchIndicator from '@/components/ui/match-indicator';
import ImageViewer from '@/components/ui/image-viewer';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api/client';
import { FIELD_LABELS, BEVERAGE_TYPE_LABELS } from '@/lib/constants';
import type { ApplicationDetail } from '@/lib/types/application';

type MatchResult = 'MATCH' | 'MISMATCH' | 'PARTIAL' | 'NOT_FOUND';

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const id = params.id as string;

  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyElapsed, setVerifyElapsed] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, { result: MatchResult; reason: string }>>({});
  const [agentNotes, setAgentNotes] = useState('');
  const [confirmAction, setConfirmAction] = useState<'MANUAL_PASS' | 'MANUAL_FAIL' | null>(null);

  const fetchApplication = useCallback(async () => {
    try {
      const data = await api.get<ApplicationDetail>(`/api/applications/${id}`);
      setApp(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load application');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  // Timer for verification elapsed time
  useEffect(() => {
    if (!verifying) return;
    const interval = setInterval(() => {
      setVerifyElapsed((prev) => prev + 100);
    }, 100);
    return () => clearInterval(interval);
  }, [verifying]);

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyElapsed(0);
    try {
      const result = await api.post<{
        processed: number;
        results: Array<{ overallResult: string; processingTimeMs: number }>;
        errors?: Array<{ error: string }>;
      }>('/api/verify', { applicationIds: [id] });

      if (result.processed > 0) {
        const r = result.results[0];
        toast(
          r.overallResult === 'AUTO_PASS' ? 'success' : 'info',
          `Verification complete: ${r.overallResult.replace('_', ' ')} (${(r.processingTimeMs / 1000).toFixed(1)}s)`
        );
      }
      if (result.errors && result.errors.length > 0) {
        toast('error', result.errors[0].error);
      }
      // Refresh to show results
      await fetchApplication();
    } catch (err) {
      toast('error', err instanceof ApiError ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleOverride = (fieldId: string, result: MatchResult, reason: string) => {
    setOverrides((prev) => ({ ...prev, [fieldId]: { result, reason } }));
  };

  const handleSubmitReview = async (decision: 'MANUAL_PASS' | 'MANUAL_FAIL') => {
    setSubmittingReview(true);
    setError(null);
    try {
      await api.post(`/api/applications/${id}/review`, {
        overallResult: decision,
        agentNotes,
        fieldOverrides: Object.entries(overrides).map(([fieldId, o]) => ({
          fieldId,
          result: o.result,
          reason: o.reason,
        })),
      });
      toast('success', `Application ${decision === 'MANUAL_PASS' ? 'approved' : 'rejected'}`);
      router.push('/history');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Review failed';
      setError(msg);
      toast('error', msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageHeader title="Application Detail" />
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error && !app) {
    return (
      <div>
        <PageHeader title="Application Detail" />
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button variant="secondary" onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!app) return null;

  const vr = app.verificationResult;
  const isPending = app.status === 'PENDING';
  const isReviewable = app.status === 'VERIFIED' && vr;

  return (
    <div>
      <PageHeader
        title={app.brandName}
        description={`${BEVERAGE_TYPE_LABELS[app.beverageType]} — ${app.classType}`}
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge status={app.status} />
            {vr && (
              <span className={`text-sm font-medium ${
                vr.overallResult.includes('PASS') ? 'text-green-700' : 'text-red-700'
              }`}>
                {vr.overallResult.replace('_', ' ')}
              </span>
            )}
            {isPending && (
              <Button onClick={handleVerify} loading={verifying}>
                {verifying ? `Verifying... (${(verifyElapsed / 1000).toFixed(1)}s)` : 'Verify Now'}
              </Button>
            )}
          </div>
        }
      />

      {/* Verification in progress overlay */}
      {verifying && (
        <div className="mb-6 p-6 bg-indigo-50 border border-indigo-200 rounded-lg text-center">
          <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-indigo-800 font-medium">Processing label verification...</p>
          <p className="text-indigo-600 text-sm mt-1">Elapsed: {(verifyElapsed / 1000).toFixed(1)}s</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Label Image */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Label Image</h2>
          <ImageViewer src={app.imageUrl} alt={`${app.brandName} label`} />
          <p className="text-xs text-gray-500 mt-2">{app.imageFilename}</p>
        </div>

        {/* Right: Application Data */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="text-sm font-medium text-gray-700 mb-3">Application Data</h2>
            <dl className="space-y-2">
              {Object.entries(FIELD_LABELS).map(([field, label]) => {
                const value = app[field as keyof ApplicationDetail];
                if (value === null || value === undefined) return null;
                return (
                  <div key={field} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                    <dt className="text-sm text-gray-500">{label}</dt>
                    <dd className="text-sm text-gray-900 text-right max-w-[60%] break-words">{String(value)}</dd>
                  </div>
                );
              })}
            </dl>
          </div>

          {vr && (
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h2 className="text-sm font-medium text-gray-700 mb-3">Verification Metrics</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Processing Time</p>
                  <p className="text-lg font-semibold text-gray-900">{(vr.processingTimeMs / 1000).toFixed(2)}s</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">OCR Confidence</p>
                  <p className="text-lg font-semibold text-gray-900">{Math.round(vr.ocrConfidence * 100)}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Pending state — no results yet */}
          {isPending && !verifying && (
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-6 text-center">
              <svg className="mx-auto h-10 w-10 text-amber-400 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-amber-800 font-medium">Awaiting Verification</p>
              <p className="text-amber-600 text-sm mt-1">Click &ldquo;Verify Now&rdquo; to run the OCR pipeline on this label.</p>
            </div>
          )}
        </div>
      </div>

      {/* Field-by-field results */}
      {vr && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-700">Field-by-Field Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Extracted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confidence</th>
                  {isReviewable && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Override</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vr.fieldResults.map((fr) => {
                  const override = overrides[fr.id];
                  const displayResult = fr.agentOverride || override?.result || fr.autoResult;
                  return (
                    <tr key={fr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {FIELD_LABELS[fr.fieldName] || fr.fieldName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[300px] break-words whitespace-normal">
                        {fr.expectedValue}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 max-w-[300px] break-words whitespace-normal">
                        {fr.extractedValue || <span className="italic text-gray-400">Not found</span>}
                      </td>
                      <td className="px-4 py-3">
                        <MatchIndicator result={displayResult} confidence={fr.confidence} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {Math.round(fr.confidence * 100)}%
                      </td>
                      {isReviewable && (
                        <td className="px-4 py-3">
                          <select
                            value={override?.result || ''}
                            onChange={(e) => {
                              const val = e.target.value as MatchResult | '';
                              if (!val) {
                                setOverrides((prev) => {
                                  const next = { ...prev };
                                  delete next[fr.id];
                                  return next;
                                });
                              } else {
                                handleOverride(fr.id, val, override?.reason || '');
                              }
                            }}
                            className="text-xs rounded border-gray-300 py-1"
                          >
                            <option value="">—</option>
                            <option value="MATCH">Match</option>
                            <option value="MISMATCH">Mismatch</option>
                            <option value="PARTIAL">Partial</option>
                          </select>
                          {override && (
                            <input
                              type="text"
                              placeholder="Reason"
                              value={override.reason}
                              onChange={(e) => handleOverride(fr.id, override.result, e.target.value)}
                              className="mt-1 w-full text-xs rounded border-gray-300 py-1"
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OCR Raw Text */}
      {vr && (
        <details className="mt-6 bg-white rounded-lg border border-gray-200">
          <summary className="px-4 py-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-50">
            OCR Raw Text
          </summary>
          <pre className="px-4 py-3 text-xs text-gray-600 whitespace-pre-wrap border-t border-gray-200 max-h-[300px] overflow-auto">
            {vr.ocrRawText}
          </pre>
        </details>
      )}

      {/* Manual Review Panel */}
      {isReviewable && (
        <div className="mt-6 bg-amber-50 rounded-lg border border-amber-200 p-6">
          <h2 className="text-sm font-medium text-amber-800 mb-3">Manual Review</h2>
          <div className="mb-4">
            <label htmlFor="agentNotes" className="block text-sm text-gray-700 mb-1">Agent Notes</label>
            <textarea
              id="agentNotes"
              rows={3}
              value={agentNotes}
              onChange={(e) => setAgentNotes(e.target.value)}
              placeholder="Optional notes about your review decision..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => setConfirmAction('MANUAL_PASS')}
              loading={submittingReview}
            >
              Approve (Manual Pass)
            </Button>
            <Button
              variant="danger"
              onClick={() => setConfirmAction('MANUAL_FAIL')}
              loading={submittingReview}
            >
              Reject (Manual Fail)
            </Button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>
      )}

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === 'MANUAL_PASS' ? 'Approve Application' : 'Reject Application'}
        message={confirmAction === 'MANUAL_PASS'
          ? 'Are you sure you want to approve this application? This will mark it as manually passed.'
          : 'Are you sure you want to reject this application? This will mark it as manually failed.'}
        confirmLabel={confirmAction === 'MANUAL_PASS' ? 'Approve' : 'Reject'}
        confirmVariant={confirmAction === 'MANUAL_PASS' ? 'primary' : 'danger'}
        onConfirm={() => {
          if (confirmAction) handleSubmitReview(confirmAction);
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

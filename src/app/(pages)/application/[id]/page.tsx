'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/page-header';
import Button from '@/components/ui/button';
import StatusBadge from '@/components/ui/status-badge';
import MatchIndicator from '@/components/ui/match-indicator';
import ImageViewer from '@/components/ui/image-viewer';
import { FIELD_LABELS, BEVERAGE_TYPE_LABELS } from '@/lib/constants';
import type { ApplicationDetail } from '@/lib/types/application';

type MatchResult = 'MATCH' | 'MISMATCH' | 'PARTIAL' | 'NOT_FOUND';

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, { result: MatchResult; reason: string }>>({});
  const [agentNotes, setAgentNotes] = useState('');

  const fetchApplication = useCallback(async () => {
    try {
      const res = await fetch(`/api/applications/${id}`);
      if (!res.ok) throw new Error('Application not found');
      const data = await res.json();
      setApp(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApplication();
  }, [fetchApplication]);

  const handleOverride = (fieldId: string, result: MatchResult, reason: string) => {
    setOverrides((prev) => ({ ...prev, [fieldId]: { result, reason } }));
  };

  const handleSubmitReview = async (decision: 'MANUAL_PASS' | 'MANUAL_FAIL') => {
    setSubmittingReview(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallResult: decision,
          agentNotes,
          fieldOverrides: Object.entries(overrides).map(([fieldId, o]) => ({
            fieldId,
            result: o.result,
            reason: o.reason,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Review submission failed');
      }
      router.push('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Review failed');
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

  if (error || !app) {
    return (
      <div>
        <PageHeader title="Application Detail" />
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Application not found'}</p>
          <Button variant="secondary" onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const vr = app.verificationResult;
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
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Label Image */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Label Image</h2>
          <ImageViewer src={app.imageUrl} alt={`${app.brandName} label`} />
          <p className="text-xs text-gray-500 mt-2">{app.imageFilename}</p>
        </div>

        {/* Right: Application Data */}
        <div className="space-y-6">
          {/* Application Fields */}
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

          {/* Verification Metrics */}
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
        </div>
      </div>

      {/* Field-by-field results */}
      {vr && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-medium text-gray-700">Field-by-Field Comparison</h2>
          </div>
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
                const displayResult = fr.agentOverride || (override?.result) || fr.autoResult;
                return (
                  <tr key={fr.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {FIELD_LABELS[fr.fieldName] || fr.fieldName}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={fr.expectedValue}>
                      {fr.expectedValue}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={fr.extractedValue || 'Not found'}>
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
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={() => handleSubmitReview('MANUAL_PASS')}
              loading={submittingReview}
            >
              Approve (Manual Pass)
            </Button>
            <Button
              variant="danger"
              onClick={() => handleSubmitReview('MANUAL_FAIL')}
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
    </div>
  );
}

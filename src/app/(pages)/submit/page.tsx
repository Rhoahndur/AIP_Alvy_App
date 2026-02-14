'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/page-header';
import Button from '@/components/ui/button';
import FileUpload from '@/components/ui/file-upload';
import BeverageTypeSelector from '@/components/forms/beverage-type-selector';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api/client';
import { FIELD_LABELS, UNIVERSAL_FIELDS, WINE_ONLY_FIELDS, GOVERNMENT_WARNING_TEXT } from '@/lib/constants';

type SubmitMode = 'single' | 'batch';

export default function SubmitPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<SubmitMode>('single');
  const [beverageType, setBeverageType] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [csvFile, setCsvFile] = useState<File[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pairingPreview, setPairingPreview] = useState<{
    matched: { csvFilename: string; imageFile: string }[];
    unmatchedRecords: string[];
    unmatchedImages: string[];
  } | null>(null);

  useEffect(() => {
    if (mode !== 'batch' || csvFile.length === 0 || imageFiles.length === 0) {
      setPairingPreview(null);
      return;
    }

    let cancelled = false;

    csvFile[0].text().then((text) => {
      if (cancelled) return;

      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setPairingPreview(null);
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      const filenameIdx = headers.indexOf('image_filename');
      if (filenameIdx === -1) {
        setPairingPreview(null);
        return;
      }

      const csvFilenames: string[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',');
        const fname = cols[filenameIdx]?.trim();
        if (fname) csvFilenames.push(fname);
      }

      const imageNames = imageFiles.map((f) => f.name);
      const imageNamesLower = new Map(imageNames.map((n) => [n.toLowerCase(), n]));

      const matched: { csvFilename: string; imageFile: string }[] = [];
      const unmatchedRecords: string[] = [];

      for (const csvFn of csvFilenames) {
        const found = imageNamesLower.get(csvFn.toLowerCase());
        if (found) {
          matched.push({ csvFilename: csvFn, imageFile: found });
        } else {
          unmatchedRecords.push(csvFn);
        }
      }

      const matchedImageLower = new Set(matched.map((m) => m.imageFile.toLowerCase()));
      const unmatchedImages = imageNames.filter((n) => !matchedImageLower.has(n.toLowerCase()));

      setPairingPreview({ matched, unmatchedRecords, unmatchedImages });
    });

    return () => { cancelled = true; };
  }, [mode, csvFile, imageFiles]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const fieldsToShow = (beverageType === 'WINE'
    ? [...UNIVERSAL_FIELDS, ...WINE_ONLY_FIELDS]
    : UNIVERSAL_FIELDS
  ).filter((f) => f !== 'governmentWarning');

  const handleSingleSubmit = async () => {
    if (!beverageType || imageFiles.length === 0) {
      setError('Please select a beverage type and upload a label image.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body = new FormData();
      body.append('image', imageFiles[0]);
      body.append('beverageType', beverageType);
      for (const [key, value] of Object.entries(formData)) {
        body.append(key, value);
      }

      await api.post('/api/applications', body);
      toast('success', 'Application submitted successfully');
      router.push('/queue');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Submission failed';
      setError(msg);
      toast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchSubmit = async () => {
    if (csvFile.length === 0 || imageFiles.length === 0) {
      setError('Please upload both a CSV file and label images.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const body = new FormData();
      body.append('csv', csvFile[0]);
      for (const file of imageFiles) {
        body.append('images', file);
      }

      const result = await api.post<{ batchId: string; created: number; warnings: string[] }>('/api/applications/batch', body);
      toast('success', `Batch uploaded: ${result.created} applications created`);
      if (result.warnings.length > 0) {
        toast('info', `${result.warnings.length} warning(s) during import`);
      }
      router.push(`/queue?batch=${result.batchId}`);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Batch upload failed';
      setError(msg);
      toast('error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Submit Application"
        description="Submit a single label or batch upload via CSV"
      />

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setMode('single')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'single'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Single Application
        </button>
        <button
          type="button"
          onClick={() => setMode('batch')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'batch'
              ? 'bg-indigo-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          Batch Upload
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {mode === 'single' ? (
        <div className="space-y-6">
          <BeverageTypeSelector value={beverageType} onChange={setBeverageType} />

          {beverageType && (
            <>
              <FileUpload
                onFilesSelected={setImageFiles}
                label="Label Image"
              />

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Application Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fieldsToShow.map((field) => (
                    <div key={field} className={field === 'nameAddress' ? 'md:col-span-2' : ''}>
                      <label htmlFor={field} className="block text-sm text-gray-600 mb-1">
                        {FIELD_LABELS[field]}
                      </label>
                      {field === 'nameAddress' ? (
                        <textarea
                          id={field}
                          rows={3}
                          value={formData[field] || ''}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      ) : (
                        <input
                          id={field}
                          type="text"
                          value={formData[field] || ''}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-1">Government Warning</h3>
                <p className="text-sm text-blue-700 mb-2">
                  The standard government warning text is automatically included with every submission. You do not need to enter it — verification will still check that it appears on the label image.
                </p>
                <p className="text-xs text-blue-600 bg-blue-100 rounded p-2 leading-relaxed">
                  {GOVERNMENT_WARNING_TEXT}
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSingleSubmit} loading={submitting}>
                  Submit Application
                </Button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">How Batch Upload Works</h3>
            <ol className="text-sm text-gray-600 list-decimal list-inside space-y-1 mb-4">
              <li>Download the <a href="/template.csv" className="text-indigo-600 hover:text-indigo-800 underline">CSV template</a></li>
              <li>Fill in one row per application, with the <code className="bg-gray-100 px-1 rounded">image_filename</code> matching an uploaded image</li>
              <li>Upload the CSV and all label images together</li>
            </ol>
          </div>

          <FileUpload
            onFilesSelected={setCsvFile}
            accept="text/csv,.csv"
            label="CSV Data File"
          />

          <FileUpload
            onFilesSelected={setImageFiles}
            multiple
            label="Label Images"
          />

          {pairingPreview && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Pairing Preview</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium">Status</th>
                      <th className="text-left py-2 pr-4 text-gray-500 font-medium">CSV Filename</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Image File</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pairingPreview.matched.map((m) => (
                      <tr key={m.csvFilename} className="border-b border-gray-100 bg-green-50">
                        <td className="py-2 pr-4 text-green-700 font-medium">Matched</td>
                        <td className="py-2 pr-4 text-gray-900">{m.csvFilename}</td>
                        <td className="py-2 text-gray-900">{m.imageFile}</td>
                      </tr>
                    ))}
                    {pairingPreview.unmatchedRecords.map((r) => (
                      <tr key={r} className="border-b border-gray-100 bg-red-50">
                        <td className="py-2 pr-4 text-red-700 font-medium">No Image</td>
                        <td className="py-2 pr-4 text-gray-900">{r}</td>
                        <td className="py-2 text-gray-400">—</td>
                      </tr>
                    ))}
                    {pairingPreview.unmatchedImages.map((img) => (
                      <tr key={img} className="border-b border-gray-100 bg-yellow-50">
                        <td className="py-2 pr-4 text-yellow-700 font-medium">No CSV Row</td>
                        <td className="py-2 pr-4 text-gray-400">—</td>
                        <td className="py-2 text-gray-900">{img}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pairingPreview.matched.length === 0 && (
                <p className="mt-3 text-sm text-red-600">No matched pairs found. Check that CSV <code className="bg-gray-100 px-1 rounded">image_filename</code> values match your uploaded image filenames.</p>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button
              onClick={handleBatchSubmit}
              loading={submitting}
              disabled={pairingPreview !== null && pairingPreview.matched.length === 0}
            >
              {pairingPreview && pairingPreview.matched.length > 0
                ? `Submit ${pairingPreview.matched.length} Application${pairingPreview.matched.length !== 1 ? 's' : ''}`
                : 'Upload Batch'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

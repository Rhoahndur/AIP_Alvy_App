'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/page-header';
import Button from '@/components/ui/button';
import FileUpload from '@/components/ui/file-upload';
import BeverageTypeSelector from '@/components/forms/beverage-type-selector';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api/client';
import { FIELD_LABELS, UNIVERSAL_FIELDS, WINE_ONLY_FIELDS } from '@/lib/constants';

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

  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const fieldsToShow = beverageType === 'WINE'
    ? [...UNIVERSAL_FIELDS, ...WINE_ONLY_FIELDS]
    : UNIVERSAL_FIELDS;

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
                    <div key={field} className={field === 'governmentWarning' || field === 'nameAddress' ? 'md:col-span-2' : ''}>
                      <label htmlFor={field} className="block text-sm text-gray-600 mb-1">
                        {FIELD_LABELS[field]}
                      </label>
                      {(field === 'governmentWarning' || field === 'nameAddress') ? (
                        <textarea
                          id={field}
                          rows={3}
                          value={formData[field] || ''}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      ) : (
                        <input
                          id={field}
                          type="text"
                          value={formData[field] || ''}
                          onChange={(e) => handleFieldChange(field, e.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
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

          <div className="flex justify-end">
            <Button onClick={handleBatchSubmit} loading={submitting}>
              Upload Batch
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

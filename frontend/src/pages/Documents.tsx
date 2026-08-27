import React, { useState } from 'react';
import { useLedgerly } from '../context/LedgerlyContext';
import { formatDate } from '../utils/formatters';
import { 
  UploadCloud, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  FileBadge
} from 'lucide-react';

export default function DocumentsPage() {
  const { documents, settings, uploadDocumentFile, syncGoogleDrive } = useLedgerly();

  // Upload progress state
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 20 MB
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File exceeds 20 MB size limit.');
      setUploadSuccess(null);
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      await uploadDocumentFile(file);
      setUploadSuccess(`Successfully stored "${file.name}" in secure vault.`);
      // Clear file selector
      e.target.value = '';
    } catch (err: any) {
      setUploadError(err.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSyncClick = async () => {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      const res = await syncGoogleDrive();
      setSyncResult(res);
    } catch (err: any) {
      setSyncError(err.message || 'Drive sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  // Format bytes helper
  const formatBytes = (bytes: number, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    if (status === 'stored') {
      return <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">Stored</span>;
    }
    if (status === 'queued') {
      return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">Queued</span>;
    }
    return <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">Needs review</span>;
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Top Section Cards: Manual Upload and Google Drive inbox status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Manual upload card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-xs font-bold text-gray-900">Upload Documents</h3>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Upload receipts, statement spreads, invoices, or images (Max 20 MB)</p>
          </div>

          {uploadError && (
            <div className="p-3 bg-red-50 text-red-800 border border-red-100 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 bg-green-50 text-green-800 border border-green-100 rounded-xl text-[11px] font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>{uploadSuccess}</span>
            </div>
          )}

          <div className="border-2 border-dashed border-gray-200 hover:border-[#6558D3] transition-colors rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer relative bg-gray-50/50">
            <UploadCloud className="w-8 h-8 text-[#6558D3]/50 mb-2" />
            <span className="text-xs font-extrabold text-gray-700 block">Click or Drag receipt here</span>
            <span className="text-[9px] text-gray-400 font-bold block mt-1">Accepts PDF, PNG, JPG, CSV, XLS</span>
            <input
              type="file"
              onChange={handleFileChange}
              disabled={uploading}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
        </div>

        {/* Google Drive Inbox details */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xs font-bold text-gray-900">Google Drive Sync Inbox</h3>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Loads files from folder: <span className="font-bold text-gray-700">Ledgerly Financial Inbox</span></p>
            </div>
            
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">8:00 AM Active</span>
          </div>

          {syncError && (
            <div className="p-3 bg-red-50 text-red-800 border border-red-100 rounded-xl text-[11px] font-bold">
              {syncError}
            </div>
          )}

          {syncResult && (
            <div className="p-3 bg-green-50 text-green-800 border border-green-100 rounded-xl text-[11px] font-bold space-y-1">
              <span className="font-extrabold block text-green-900">Sync Completed:</span>
              <div className="text-[10px] font-semibold text-green-800/80">
                Processed: {syncResult.importedCount} txs | Stored: {syncResult.filesStored || 0} files | Dupes: {syncResult.duplicateCount}
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl space-y-2 text-[10px] font-bold text-gray-500">
            <div className="flex justify-between">
              <span>Drive sync status:</span>
              <span className="uppercase text-gray-700 font-extrabold">{settings?.driveSyncLogs?.lastStatus || 'never'}</span>
            </div>
            <div className="flex justify-between">
              <span>Processed file count:</span>
              <span className="text-gray-700">{settings?.driveSyncLogs?.importedCount || 0} items</span>
            </div>
            <div className="flex justify-between">
              <span>Last checked at:</span>
              <span className="font-mono text-gray-400">{settings?.driveSyncLogs?.lastSyncedAt ? formatDate(settings.driveSyncLogs.lastSyncedAt) : 'Never'}</span>
            </div>
          </div>

          <button
            onClick={handleSyncClick}
            disabled={syncing}
            className="w-full bg-[#6558D3] hover:bg-[#4d3ecc] text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync Google Drive Now</span>
          </button>
        </div>

      </div>

      {/* Secure document vault vault list */}
      <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-xs font-bold text-gray-900">Secure Document Vault</h3>
          <p className="text-[10px] text-gray-400 font-semibold">Decrypted storage references. Raw files are saved to emulated Cloudflare R2 bucket.</p>
        </div>

        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                <th className="px-4 py-3">Filename</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Import Date</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 font-semibold text-gray-700">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400 font-bold">
                    No documents uploaded or synced yet. Use the upload panel to store statement receipts.
                  </td>
                </tr>
              ) : (
                documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-extrabold text-gray-900 flex items-center gap-2">
                      <FileBadge className="w-4 h-4 text-[#6558D3]" />
                      <span className="truncate max-w-[200px]" title={doc.filename}>{doc.filename}</span>
                    </td>
                    <td className="px-4 py-3 uppercase text-[10px] text-gray-400 font-mono">{doc.mimeType.split('/')[1] || doc.mimeType}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-[10px]">{formatBytes(doc.size)}</td>
                    <td className="px-4 py-3 capitalize text-gray-500">{doc.source === 'google-drive' ? 'Google Drive' : 'Manual Upload'}</td>
                    <td className="px-4 py-3">{getStatusBadge(doc.status)}</td>
                    <td className="px-4 py-3 font-mono text-[10px] text-gray-400">{formatDate(doc.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => alert(`Reviewing document: ${doc.filename} (ObjectKey: ${doc.objectKey})`)}
                        className="p-1 hover:bg-gray-100 text-[#6558D3] hover:text-[#4d3ecc] rounded-lg cursor-pointer text-[10px] font-extrabold"
                        title="View Metadata"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  uploadImportFile, 
  getImportBatches, 
  getImportBatchPreview,
  normalizeImportBatch,
  getImportStats
} from '../api/imports.api';
import { formatCurrency } from '../utils/formatters';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Eye, 
  ArrowRight,
  Sparkles,
  Database,
  Layers,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Info,
  ChevronRight,
  Settings,
  HelpCircle,
  Inbox,
  AlertCircle
} from 'lucide-react';

interface ImportBatchItem {
  id: string;
  fileName: string;
  fileType: string;
  totalRecords: number;
  validRecords: number;
  invalidRecords: number;
  duplicateCount: number;
  processingTime: number;
  status: string;
  category: string;
  createdAt: string;
}

interface SourceSchema {
  id: string;
  name: string;
  description: string;
  icon: any;
  requiredFields: string[];
  optionalFields: string[];
  heuristics: Record<string, string[]>;
  categoryMap: string;
}

const SOURCES: SourceSchema[] = [
  {
    id: 'INVOICE',
    name: 'Invoice',
    description: 'Customer invoice records representing accounts receivable.',
    icon: FileText,
    requiredFields: ['invoice_id', 'invoice_date', 'customer_name', 'invoice_amount'],
    optionalFields: ['currency', 'status', 'reference'],
    heuristics: {
      invoice_id: ['invoice id', 'invoice number', 'invoice no', 'invoice_id', 'id', 'inv no', 'inv_id'],
      invoice_date: ['date', 'invoice date', 'billing date', 'invoice_date', 'inv_date', 'issue_date'],
      customer_name: ['customer', 'customer name', 'client', 'client name', 'customer_name'],
      invoice_amount: ['amount', 'invoice amount', 'total', 'grand total', 'invoice_amount', 'total amount'],
      currency: ['currency', 'currency code', 'currency_code'],
      status: ['status', 'state', 'invoice_status'],
      reference: ['reference', 'ref', 'reference_number', 'reference number']
    },
    categoryMap: 'Invoices'
  },
  {
    id: 'PAYMENT',
    name: 'Payment',
    description: 'Captured customer payment transactions from checkout portals.',
    icon: Activity,
    requiredFields: ['payment_id', 'payment_date', 'customer_name', 'amount'],
    optionalFields: ['currency', 'status', 'invoice_id', 'gateway', 'gateway_reference'],
    heuristics: {
      payment_id: ['payment id', 'payment reference', 'payment no', 'payment_id', 'id', 'pay_id'],
      payment_date: ['payment date', 'date', 'payment_date', 'created_at', 'captured_at'],
      customer_name: ['customer', 'customer name', 'client', 'customer_name', 'payer'],
      amount: ['amount', 'paid amount', 'payment amount', 'value', 'net amount'],
      currency: ['currency', 'currency code'],
      status: ['status', 'state', 'payment_status'],
      invoice_id: ['invoice id', 'invoice no', 'invoice_id', 'inv_id'],
      gateway: ['gateway', 'payment gateway', 'payment_gateway', 'provider'],
      gateway_reference: ['gateway reference', 'gateway_reference', 'gateway_id', 'transaction_reference']
    },
    categoryMap: 'Payments'
  },
  {
    id: 'SETTLEMENT',
    name: 'Razorpay Settlement',
    description: 'Gateway payouts detailing deposits transferred to your corporate accounts.',
    icon: Layers,
    requiredFields: ['settlement_id', 'settlement_date', 'utr', 'payment_id', 'settled_amount'],
    optionalFields: ['currency', 'gateway', 'status'],
    heuristics: {
      settlement_id: ['settlement id', 'settlement', 'settlement reference', 'settlement_id', 'id'],
      settlement_date: ['settlement date', 'date', 'settlement_date', 'payout_date', 'created_at'],
      utr: ['utr', 'utr number', 'settlement utr', 'utr_number', 'bank_reference'],
      payment_id: ['payment id', 'payment_id', 'transaction_id', 'txn_id'],
      settled_amount: ['settled amount', 'settlement amount', 'net amount', 'amount', 'settled_amount'],
      currency: ['currency', 'currency code'],
      gateway: ['gateway', 'gateway_name', 'provider'],
      status: ['status', 'settlement_status']
    },
    categoryMap: 'Settlements'
  },
  {
    id: 'BANK_TRANSACTION',
    name: 'Bank Statement',
    description: 'Cleared ledger statements detailing corporate credit and debit flows.',
    icon: Database,
    requiredFields: ['bank_transaction_id', 'transaction_date', 'description', 'credit', 'debit'],
    optionalFields: ['currency', 'utr', 'reference'],
    heuristics: {
      bank_transaction_id: ['transaction id', 'txn id', 'bank transaction id', 'bank_transaction_id', 'id', 'txn_ref_no'],
      transaction_date: ['date', 'transaction date', 'value date', 'transaction_date', 'txn_date', 'booking_date'],
      description: ['description', 'narration', 'particulars', 'remarks', 'memo'],
      credit: ['credit', 'credit amount', 'deposit', 'received', 'inflow'],
      debit: ['debit', 'debit amount', 'withdrawal', 'spent', 'outflow'],
      currency: ['currency', 'currency code'],
      utr: ['utr', 'utr number', 'bank reference', 'reference UTR'],
      reference: ['reference', 'ref', 'reference_number', 'cheque_no']
    },
    categoryMap: 'Bank Transactions'
  }
];

export default function DataCenter() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stats overview state
  const [stats, setStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);

  // Core wizard states: 'source' | 'upload' | 'mapping' | 'validation' | 'complete'
  const [wizardStep, setWizardStep] = useState<'source' | 'upload' | 'mapping' | 'validation' | 'complete'>('source');
  const [selectedSource, setSelectedSource] = useState<SourceSchema | null>(null);

  const [batches, setBatches] = useState<ImportBatchItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  // Upload state
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastUploaded, setLastUploaded] = useState<any | null>(null);

  // Column mapping state
  const [originalColumns, setOriginalColumns] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappingConfidences, setMappingConfidences] = useState<Record<string, { percent: number; label: string; color: string }>>({});

  // Validation outcomes
  const [validating, setValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Raw preview modal state
  const [previewBatch, setPreviewBatch] = useState<ImportBatchItem | null>(null);
  const [previewRecords, setPreviewRecords] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await getImportStats();
      if (res.success && res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Failed to load Ingestion statistics:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await getImportBatches();
      if (res.success && Array.isArray(res.imports)) {
        setBatches(res.imports);
      }
    } catch (err) {
      console.error('Failed to load imports history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchHistory();
  }, []);

  const handleSourceSelect = (source: SourceSchema) => {
    setSelectedSource(source);
    setWizardStep('upload');
  };

  const handleUploadFile = async (file: File) => {
    if (!file || !selectedSource) return;
    setUploading(true);
    setUploadError(null);

    // Dynamic extension check
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['csv', 'xlsx', 'json'].includes(ext)) {
      setUploadError('Unsupported file type. Only CSV, XLSX, and JSON files are allowed.');
      setUploading(false);
      return;
    }

    try {
      const res = await uploadImportFile(selectedSource.categoryMap, file);
      if (res.success && res.batch) {
        setLastUploaded(res.batch);
        
        // Retrieve staging rows for mapping preview
        const previewRes = await getImportBatchPreview(res.batch.id);
        if (previewRes.success && Array.isArray(previewRes.records) && previewRes.records.length > 0) {
          setPreviewRows(previewRes.records);
          const sampleRaw = previewRes.records[0].rawData;
          if (sampleRaw && typeof sampleRaw === 'object') {
            const cols = Object.keys(sampleRaw);
            setOriginalColumns(cols);
            runAutoMapping(cols, selectedSource);
          }
        }
        setWizardStep('mapping');
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.error || err.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // Source-aware Smart Auto-Mapping
  const runAutoMapping = (cols: string[], source: SourceSchema) => {
    const nextMapping: Record<string, string> = {};
    const nextConfidences: Record<string, { percent: number; label: string; color: string }> = {};

    const allSchemaFields = [...source.requiredFields, ...source.optionalFields];

    allSchemaFields.forEach(field => {
      const targetHeuristics = source.heuristics[field] || [];
      let matchedCol = '';
      let confidenceScore = 0;

      // Rule A: Check exact match or primary alias match
      for (const col of cols) {
        const normalizedCol = col.toLowerCase().trim();
        const firstMatchIndex = targetHeuristics.findIndex(h => h === normalizedCol);
        if (firstMatchIndex !== -1) {
          matchedCol = col;
          // Exact matches are 95-100% confidence
          confidenceScore = firstMatchIndex === 0 ? 100 : 95;
          break;
        }
      }

      // Rule B: Fallback substring checks
      if (!matchedCol) {
        for (const col of cols) {
          const normalizedCol = col.toLowerCase().trim();
          const hasSubstring = targetHeuristics.some(h => normalizedCol.includes(h) || h.includes(normalizedCol));
          if (hasSubstring) {
            matchedCol = col;
            confidenceScore = 75; // Medium confidence
            break;
          }
        }
      }

      // Never map unrelated values (force 0% unmapped)
      if (matchedCol) {
        nextMapping[field] = matchedCol;
        if (confidenceScore >= 95) {
          nextConfidences[field] = { percent: confidenceScore, label: 'High', color: 'text-green-600 bg-green-50 border-green-100' };
        } else {
          nextConfidences[field] = { percent: confidenceScore, label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-100' };
        }
      } else {
        nextMapping[field] = '';
        nextConfidences[field] = { percent: 0, label: 'Needs Review', color: 'text-red-500 bg-red-50 border-red-100' };
      }
    });

    setMapping(nextMapping);
    setMappingConfidences(nextConfidences);
  };

  const handleMappingSelectChange = (field: string, val: string) => {
    const next = { ...mapping, [field]: val };
    setMapping(next);

    // Calculate manual confidence rating (100% if selected, 0% if empty)
    const nextConf = { ...mappingConfidences };
    if (val) {
      nextConf[field] = { percent: 100, label: 'User Defined', color: 'text-blue-600 bg-blue-50 border-blue-100' };
    } else {
      nextConf[field] = { percent: 0, label: 'Needs Review', color: 'text-red-500 bg-red-50 border-red-100' };
    }
    setMappingConfidences(nextConf);
  };

  const handleNormalizeAndValidate = async () => {
    if (!lastUploaded || !selectedSource) return;

    // Check mandatory fields
    const missingMandatory = selectedSource.requiredFields.filter(f => !mapping[f]);
    if (missingMandatory.length > 0) {
      setUploadError(`Missing required mappings: ${missingMandatory.map(f => f.toUpperCase().replace('_', ' ')).join(', ')}`);
      return;
    }

    setValidating(true);
    setUploadError(null);

    try {
      const res = await normalizeImportBatch(lastUploaded.id, mapping, selectedSource.id);
      if (res.success) {
        setValidationResult(res);
        setWizardStep('validation');
      }
    } catch (err: any) {
      setUploadError(err.response?.data?.error || err.message || 'Validation normalization failed.');
    } finally {
      setValidating(false);
    }
  };

  const handleResetWizard = () => {
    setSelectedSource(null);
    setLastUploaded(null);
    setValidationResult(null);
    setPreviewRows([]);
    setOriginalColumns([]);
    setMapping({});
    setMappingConfidences({});
    setUploadError(null);
    setWizardStep('source');
    fetchStats();
    fetchHistory();
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadFile(e.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const openPreview = async (batch: ImportBatchItem) => {
    setPreviewBatch(batch);
    setLoadingPreview(true);
    setPreviewRecords([]);
    try {
      const res = await getImportBatchPreview(batch.id);
      if (res.success && Array.isArray(res.records)) {
        setPreviewRecords(res.records);
      }
    } catch (err: any) {
      alert('Failed to load raw staging records: ' + err.message);
      setPreviewBatch(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const formatStepLabel = (step: string) => {
    switch (step) {
      case 'source': return '01 Source';
      case 'upload': return '02 Upload';
      case 'mapping': return '03 Map';
      case 'validation': return '04 Validate & Review';
      case 'complete': return '05 Complete';
      default: return '';
    }
  };

  return (
    <div className="space-y-6 text-left relative min-h-[75vh]">
      
      {/* Dynamic Header Block */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0B1726]">Data Center 2.0</h2>
          <p className="text-xs text-gray-400 font-semibold mt-0.5">Ingest, validate, and normalize enterprise financial records.</p>
        </div>

        {selectedSource && (
          <div className="flex items-center gap-2 border border-gray-100 bg-gray-50/50 p-2 rounded-xl text-xs font-bold text-[#0B1726] animate-in fade-in duration-300">
            <selectedSource.icon className="w-4 h-4 text-[#2F6F73]" />
            <span>Target: {selectedSource.name}</span>
          </div>
        )}
      </div>

      {/* Step Indicators Bar */}
      <div className="flex items-center gap-1 bg-white border border-gray-100 p-2 rounded-xl shadow-2xs overflow-x-auto text-[10px] uppercase font-bold text-gray-400">
        {['source', 'upload', 'mapping', 'validation', 'complete'].map((step, idx) => {
          const stepIndex = ['source', 'upload', 'mapping', 'validation', 'complete'].indexOf(wizardStep);
          const currentIdx = idx;
          const isActive = wizardStep === step;
          const isPassed = stepIndex > currentIdx;

          return (
            <div key={step} className="flex items-center gap-1.5 flex-1 min-w-[90px] justify-center py-1">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center border text-[9px] ${
                isActive 
                  ? 'bg-[#2F6F73] text-white border-[#2F6F73]' 
                  : isPassed 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-white border-gray-200 text-gray-400'
              }`}>
                {isPassed ? '✓' : idx + 1}
              </span>
              <span className={isActive ? 'text-[#0B1726] font-extrabold' : isPassed ? 'text-green-700' : ''}>
                {step === 'source' ? 'Source' : step === 'upload' ? 'Upload' : step === 'mapping' ? 'Map' : step === 'validation' ? 'Validate' : 'Complete'}
              </span>
              {idx < 4 && <ChevronRight className="w-3.5 h-3.5 text-gray-200" />}
            </div>
          );
        })}
      </div>

      {/* ERROR BANNER */}
      {uploadError && (
        <div className="p-3.5 bg-red-50 text-[#C94C4C] border border-red-100 rounded-xl text-xs font-semibold flex items-start gap-2.5 animate-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold block text-red-700">Ingestion Error</span>
            <span>{uploadError}</span>
          </div>
        </div>
      )}

      {/* ==================== STEP 1: SOURCE SELECTION ==================== */}
      {wizardStep === 'source' && (
        <div className="space-y-6">
          <div className="text-left space-y-1">
            <h3 className="text-sm font-bold text-[#0B1726]">What are you importing?</h3>
            <p className="text-xs text-gray-400 font-semibold">Select the financial source to structure custom auto-mapping validations.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SOURCES.map((source) => (
              <div 
                key={source.id}
                onClick={() => handleSourceSelect(source)}
                className="bg-white border border-gray-100 rounded-2xl p-5 hover:border-[#2F6F73] hover:shadow-sm transition-all cursor-pointer space-y-4 group text-left relative flex flex-col justify-between"
              >
                <div className="space-y-3.5">
                  <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-[#667085] group-hover:bg-[#2F6F73]/5 group-hover:border-[#2F6F73]/20 group-hover:text-[#2F6F73] transition-colors">
                    <source.icon className="w-5 h-5" />
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="text-xs font-extrabold text-[#0B1726]">{source.name}</h4>
                    <p className="text-[10px] text-gray-400 font-semibold leading-relaxed">{source.description}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-50 text-[9px] font-semibold text-gray-400">
                  <span className="block font-bold text-gray-500 uppercase tracking-wider">Required Fields</span>
                  <div className="flex flex-wrap gap-1">
                    {source.requiredFields.map(f => (
                      <span key={f} className="bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-[8px] font-mono text-[#0B1726]">
                        {f.replace('_amount', '').replace('_id', '').replace('_date', '')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* OVERVIEW STATS PANELS */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-2xs text-left space-y-4">
            <div>
              <h3 className="text-xs font-bold text-gray-900">Ingestion Overview</h3>
              <p className="text-[10px] text-gray-400 font-semibold">Ledger status aggregates stage normalization totals.</p>
            </div>

            {loadingStats ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-[#2F6F73] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total Ledger</span>
                  <span className="text-lg font-extrabold text-gray-900 block mt-1">{stats?.totalRecords || 0}</span>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">Invoices</span>
                  <span className="text-lg font-extrabold text-blue-600 block mt-1">{stats?.invoices || 0}</span>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <span className="text-[9px] font-bold text-green-500 uppercase tracking-wider block">Payments</span>
                  <span className="text-lg font-extrabold text-green-600 block mt-1">{stats?.payments || 0}</span>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <span className="text-[9px] font-bold text-purple-500 uppercase tracking-wider block">Settlements</span>
                  <span className="text-lg font-extrabold text-purple-600 block mt-1">{stats?.settlements || 0}</span>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl">
                  <span className="text-[9px] font-bold text-teal-500 uppercase tracking-wider block">Bank Records</span>
                  <span className="text-lg font-extrabold text-teal-600 block mt-1">{stats?.bankTransactions || 0}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== STEP 2: FILE UPLOAD ==================== */}
      {wizardStep === 'upload' && selectedSource && (
        <div className="max-w-xl mx-auto bg-white border border-gray-100 rounded-2xl p-6 shadow-2xs space-y-6 text-left animate-in fade-in duration-300">
          <div className="flex justify-between items-center border-b border-gray-50 pb-3">
            <div>
              <span className="text-[9px] font-bold text-[#2F6F73] uppercase tracking-wider block">Step 2 of 5</span>
              <h3 className="text-xs font-bold text-gray-900 mt-0.5">Upload file for {selectedSource.name}</h3>
            </div>
            <button 
              onClick={handleResetWizard}
              className="text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              Change Source
            </button>
          </div>

          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={`border border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[220px] ${
              dragActive 
                ? 'border-[#2F6F73] bg-[#2F6F73]/5' 
                : 'border-gray-200 bg-gray-50/50 hover:border-gray-400'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileInputChange}
              accept=".csv, .xlsx, .json"
              className="hidden"
            />

            <UploadCloud className={`w-10 h-10 mb-3 text-gray-400 group-hover:text-gray-600 transition-colors ${dragActive ? 'text-[#2F6F73]' : ''}`} />
            
            <div className="space-y-1">
              <span className="text-xs font-bold text-gray-900 block">Drag & drop files here</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Supports CSV, XLSX, and JSON (Max 10MB)</span>
            </div>

            {uploading ? (
              <div className="mt-5 flex items-center gap-2 bg-[#2F6F73] text-white text-[10px] font-bold px-4 py-2 rounded-lg">
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Reading sheet file...</span>
              </div>
            ) : (
              <button 
                type="button" 
                className="mt-5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 text-[10px] font-bold px-4 py-2 rounded-lg shadow-2xs cursor-pointer"
              >
                Browse Files
              </button>
            )}
          </div>
        </div>
      )}

      {/* ==================== STEP 3: SOURCE-AWARE COLUMN MAPPING ==================== */}
      {wizardStep === 'mapping' && selectedSource && lastUploaded && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-2xs space-y-6">
            
            {/* Header metadata details */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-50 pb-4">
              <div>
                <span className="text-[9px] font-bold text-[#2F6F73] uppercase tracking-wider block">Step 3 of 5</span>
                <h3 className="text-sm font-extrabold text-gray-900 mt-0.5">Map Financial Fields: {lastUploaded.fileName}</h3>
                <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Review automatic schema column connections or adjust manually.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => runAutoMapping(originalColumns, selectedSource)}
                  className="inline-flex items-center gap-1.5 bg-[#2F6F73]/10 hover:bg-[#2F6F73]/20 text-[#2F6F73] text-[10px] font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Reset Auto Mapping</span>
                </button>
                <button
                  onClick={handleResetWizard}
                  className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Ingestion grid mapping form */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
              {[...selectedSource.requiredFields, ...selectedSource.optionalFields].map((field) => {
                const isRequired = selectedSource.requiredFields.includes(field);
                const conf = mappingConfidences[field] || { percent: 0, label: 'Unmapped', color: 'text-gray-400 bg-gray-50 border-gray-100' };

                return (
                  <div key={field} className="space-y-1.5 border border-gray-50 bg-gray-50/20 p-3.5 rounded-xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-900 uppercase tracking-wider block">
                          {field.replace('_', ' ')} {isRequired && <span className="text-red-500 font-extrabold">*</span>}
                        </label>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold border ${conf.color}`}>
                          {conf.label} ({conf.percent}%)
                        </span>
                      </div>
                      <p className="text-[9px] text-gray-400 font-semibold leading-relaxed mt-0.5">
                        {isRequired ? 'Mandatory canonical schema field' : 'Optional supplementary field'}
                      </p>
                    </div>

                    <select
                      value={mapping[field] || ''}
                      onChange={(e) => handleMappingSelectChange(field, e.target.value)}
                      className="w-full mt-3 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-gray-900 focus:outline-none"
                    >
                      <option value="">-- Unmapped --</option>
                      {originalColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* LIVE PREVIEW BLOCK */}
            <div className="space-y-3.5 border-t border-gray-100 pt-5 mt-4 text-left">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-gray-400" />
                <span className="text-[10px] font-bold text-gray-900 uppercase tracking-wider">Live Preview (Top 3 Normalized Rows)</span>
              </div>
              
              <div className="border border-gray-100 rounded-xl overflow-hidden bg-white p-2.5 shadow-2xs">
                <table className="w-full text-[10px] font-medium text-gray-500">
                  <thead>
                    <tr className="border-b border-gray-100 font-bold text-gray-900">
                      <th className="p-1.5 text-left">Mapped External ID</th>
                      <th className="p-1.5 text-left">Mapped Date</th>
                      <th className="p-1.5 text-right">Mapped Amount</th>
                      <th className="p-1.5 text-left">Reference / Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.slice(0, 3).map((row, rIdx) => {
                      // Dynamically render preview row values based on mapping dropdowns
                      let extId = '-';
                      let dateStr = '-';
                      let amtVal = '-';
                      let extra = '-';

                      if (selectedSource.id === 'INVOICE') {
                        extId = row.rawData[mapping.invoice_id] || '-';
                        dateStr = row.rawData[mapping.invoice_date] || '-';
                        amtVal = row.rawData[mapping.invoice_amount] || '-';
                        extra = row.rawData[mapping.customer_name] || '-';
                      } else if (selectedSource.id === 'PAYMENT') {
                        extId = row.rawData[mapping.payment_id] || '-';
                        dateStr = row.rawData[mapping.payment_date] || '-';
                        amtVal = row.rawData[mapping.amount] || '-';
                        extra = row.rawData[mapping.customer_name] || '-';
                      } else if (selectedSource.id === 'SETTLEMENT') {
                        extId = row.rawData[mapping.settlement_id] || '-';
                        dateStr = row.rawData[mapping.settlement_date] || '-';
                        amtVal = row.rawData[mapping.settled_amount] || '-';
                        extra = `UTR: ${row.rawData[mapping.utr] || '-'}`;
                      } else if (selectedSource.id === 'BANK_TRANSACTION') {
                        extId = row.rawData[mapping.bank_transaction_id] || '-';
                        dateStr = row.rawData[mapping.transaction_date] || '-';
                        const cr = row.rawData[mapping.credit] || '0';
                        const dr = row.rawData[mapping.debit] || '0';
                        amtVal = parseFloat(cr) !== 0 ? `+${cr}` : `-${dr}`;
                        extra = row.rawData[mapping.description] || '-';
                      }

                      return (
                        <tr key={rIdx} className="hover:bg-neutral-50/50">
                          <td className="p-1.5 font-mono text-gray-900 font-bold">{String(extId)}</td>
                          <td className="p-1.5">{String(dateStr)}</td>
                          <td className="p-1.5 text-right font-bold text-green-600">{String(amtVal)}</td>
                          <td className="p-1.5 truncate max-w-[200px]">{String(extra)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mapping Actions */}
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-6">
              <button
                type="button"
                onClick={handleResetWizard}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-500 cursor-pointer"
              >
                Go Back
              </button>
              
              <button
                onClick={handleNormalizeAndValidate}
                disabled={validating}
                className="bg-[#2F6F73] hover:bg-[#25575a] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {validating && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Validate & Ingest</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================== STEP 4: INTERACTIVE VALIDATION INSPECTOR ==================== */}
      {wizardStep === 'validation' && validationResult && lastUploaded && (
        <div className="space-y-6 text-left animate-in fade-in duration-300">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-2xs space-y-6">
            <div>
              <span className="text-[9px] font-bold text-[#2F6F73] uppercase tracking-wider block">Step 4 of 5</span>
              <h3 className="text-sm font-extrabold text-[#0B1726] mt-0.5">Ingestion Review & Validation Dashboard</h3>
            </div>

            {/* Validation Metrics Grid Block */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50/50 p-4 border border-gray-100 rounded-2xl">
              <div className="p-2.5">
                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Total Received</span>
                <span className="text-xl font-extrabold text-gray-900 block mt-1">{validationResult.processed}</span>
                <span className="text-[9px] text-gray-400 font-semibold block mt-0.5">Row records count</span>
              </div>
              <div className="p-2.5">
                <span className="text-[9px] font-bold text-green-600 uppercase tracking-wider block">Valid Rows</span>
                <span className="text-xl font-extrabold text-green-600 block mt-1">{validationResult.normalized}</span>
                <span className="text-[9px] text-green-600/70 font-semibold block mt-0.5">Ready for ingestion</span>
              </div>
              <div className="p-2.5">
                <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">Duplicates Detected</span>
                <span className="text-xl font-extrabold text-amber-600 block mt-1">{validationResult.duplicates}</span>
                <span className="text-[9px] text-amber-600/70 font-semibold block mt-0.5">Already stored</span>
              </div>
              <div className="p-2.5">
                <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider block">Malformed / Errors</span>
                <span className="text-xl font-extrabold text-red-500 block mt-1">{validationResult.invalid}</span>
                <span className="text-[9px] text-red-500/70 font-semibold block mt-0.5">Unparseable values</span>
              </div>
            </div>

            {/* Validation Error list details if errors exist */}
            {validationResult.errorDetails && validationResult.errorDetails.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-[#C94C4C] font-bold text-[11px] uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4" />
                  <span>Validation Error Log</span>
                </div>
                
                <div className="border border-red-100 rounded-xl overflow-hidden max-h-[250px] overflow-y-auto">
                  <table className="min-w-full text-left text-xs divide-y divide-red-100">
                    <thead className="bg-red-50/50 text-[10px] text-red-700 font-bold uppercase">
                      <tr>
                        <th className="px-4 py-2.5 w-24">Row ID</th>
                        <th className="px-4 py-2.5">Error Detail Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50 text-[11px] text-red-600/90 font-medium">
                      {validationResult.errorDetails.map((err: any, idx: number) => (
                        <tr key={idx} className="hover:bg-red-50/20">
                          <td className="px-4 py-2 font-mono font-bold">Row {err.rowNumber}</td>
                          <td className="px-4 py-2">{err.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-green-50/40 text-green-700 border border-green-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>100% Data integrity verified. Zero malformed entries detected in this file batch.</span>
              </div>
            )}

            {/* Commit Import actions */}
            <div className="flex justify-end gap-2 border-t border-gray-50 pt-4 mt-6">
              <button
                type="button"
                onClick={() => setWizardStep('mapping')}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-500 cursor-pointer"
              >
                Go Back to Mapping
              </button>
              
              <button
                onClick={() => setWizardStep('complete')}
                className="bg-[#2F6F73] hover:bg-[#25575a] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md cursor-pointer"
              >
                Confirm & Finalize Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== STEP 5: IMPORT COMPLETE SUMMARY & HANDOFF ==================== */}
      {wizardStep === 'complete' && validationResult && lastUploaded && selectedSource && (
        <div className="max-w-xl mx-auto space-y-6 text-left animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-2xs space-y-6 flex flex-col items-center text-center">
            
            <div className="w-14 h-14 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-green-600 mb-2 animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-extrabold text-[#0B1726]">IMPORT COMPLETE</h3>
              <p className="text-xs text-gray-400 font-semibold">Your financial batch has been structured and committed to the ledger.</p>
            </div>

            {/* Completion summary stats */}
            <div className="w-full bg-[#F6F8FA] border border-gray-100 p-4.5 rounded-2xl text-xs font-bold text-gray-500 space-y-3 text-left">
              <div className="flex justify-between items-center">
                <span>Category Source:</span>
                <span className="text-gray-900 font-extrabold">{selectedSource.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Total Received:</span>
                <span className="text-gray-900 font-extrabold">{validationResult.processed} rows</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Normalized & Imported:</span>
                <span className="text-green-600 font-extrabold">{validationResult.normalized} records</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Duplicates Skipped:</span>
                <span className="text-amber-500 font-extrabold">{validationResult.duplicates} rows</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Rejected Rows:</span>
                <span className="text-red-500 font-extrabold">{validationResult.invalid} rows</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Pipeline Processing Duration:</span>
                <span className="text-gray-900 font-mono font-medium">{validationResult.processingTime || '0.00'} seconds</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-200/50 pt-2.5 mt-1">
                <span>Status:</span>
                <span className="bg-[#198754]/10 text-[#198754] px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-extrabold border border-green-200">
                  Ready for Reconciliation
                </span>
              </div>
            </div>

            <div className="w-full flex flex-col gap-2.5 mt-2">
              <button
                onClick={() => navigate('/reconciliation')}
                className="w-full bg-[#2F6F73] hover:bg-[#25575a] text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Run Reconciliation</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleResetWizard}
                className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-[#0B1726] text-xs font-bold py-2.5 rounded-xl shadow-2xs transition-colors cursor-pointer"
              >
                Upload Another File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== INGESTION HISTORY LOG LIST ==================== */}
      {wizardStep === 'source' && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-2xs overflow-hidden text-left">
          <div className="p-4 border-b border-gray-50">
            <h3 className="text-xs font-bold text-gray-900">Ingestion History Logs</h3>
          </div>
          
          {loadingHistory ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-3 min-h-[250px]">
              <div className="w-6 h-6 border-2 border-[#2F6F73] border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-bold text-gray-400">Loading imports ledger...</span>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">No import batches uploaded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100 text-left text-xs font-medium text-gray-500">
                <thead className="bg-gray-50/50 text-[10px] text-[#0B1726] font-bold uppercase">
                  <tr>
                    <th className="px-4 py-3">Filename</th>
                    <th className="px-4 py-3">Source Type</th>
                    <th className="px-4 py-3 text-right">Total Rows</th>
                    <th className="px-4 py-3 text-right">Imported</th>
                    <th className="px-4 py-3 text-right">Duplicates</th>
                    <th className="px-4 py-3 text-right">Errors</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Imported At</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white font-semibold text-gray-700">
                  {batches.map((batch) => {
                    const dateObj = new Date(batch.createdAt);
                    return (
                      <tr key={batch.id} className="hover:bg-neutral-50/50">
                        <td className="px-4 py-3.5 text-[#0B1726] font-bold truncate max-w-[150px]">{batch.fileName}</td>
                        <td className="px-4 py-3 text-[11px]">{batch.category}</td>
                        <td className="px-4 py-3 text-right font-mono">{batch.totalRecords}</td>
                        <td className="px-4 py-3 text-right font-mono text-green-600">{batch.validRecords}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-500">{batch.duplicateCount}</td>
                        <td className="px-4 py-3 text-right font-mono text-red-500">{batch.invalidRecords}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            batch.status === 'NORMALIZED' || batch.status === 'SUCCESS'
                              ? 'bg-green-50 border-green-200 text-[#198754]'
                              : batch.status === 'PARTIAL'
                                ? 'bg-amber-50 border-amber-200 text-[#C58B24]'
                                : 'bg-red-50 border-red-200 text-[#C94C4C]'
                          }`}>
                            <span>{batch.status}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[11px] font-sans font-medium text-gray-400">
                          {dateObj.toLocaleDateString('en-GB')} {dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openPreview(batch)}
                            className="inline-flex items-center gap-1 text-[10px] bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-2 py-1 text-gray-500 cursor-pointer font-bold"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Preview</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RAW RECORD PREVIEW MODAL */}
      {previewBatch && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white border border-gray-100 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col text-left">
            
            <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-xs font-extrabold text-[#0B1726]">{previewBatch.fileName}</h2>
                <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{previewBatch.category} • Stage Preview Rows (Max 50)</p>
              </div>
              <button 
                onClick={() => setPreviewBatch(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
              {loadingPreview ? (
                <div className="flex flex-col items-center justify-center p-8 space-y-3 min-h-[200px]">
                  <div className="w-6 h-6 border-2 border-[#2F6F73] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[11px] font-bold text-gray-400">Fetching raw rows...</span>
                </div>
              ) : previewRecords.length === 0 ? (
                <div className="py-12 text-center text-gray-400 text-xs">No staging records found.</div>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="min-w-full divide-y divide-gray-100 text-left text-xs font-semibold text-gray-500">
                      <thead className="bg-[#F6F8FA] text-[10px] text-[#0B1726] font-bold uppercase sticky top-0 border-b border-gray-100 z-10">
                        <tr>
                          <th className="px-4 py-2.5 w-16">Row</th>
                          <th className="px-4 py-2.5">Staging Raw Row Data (JSON)</th>
                          <th className="px-4 py-2.5 w-24">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 font-mono text-[10px] text-gray-600">
                        {previewRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-neutral-50/50">
                            <td className="px-4 py-2.5 text-[#0B1726] font-bold">{rec.rowNumber}</td>
                            <td className="px-4 py-2.5 truncate max-w-[500px]">
                              {JSON.stringify(rec.rawData)}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                rec.status === 'NORMALIZED' || rec.status === 'VALID'
                                  ? 'bg-green-50 border-green-200 text-green-700'
                                  : 'bg-red-50 border-red-200 text-red-600'
                              }`}>
                                <span>{rec.status}</span>
                              </span>
                              {rec.errorMessage && (
                                <p className="text-[9px] text-[#C94C4C] mt-1 font-sans font-bold leading-normal">{rec.errorMessage}</p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-gray-100 px-6 py-4 bg-gray-50">
              <button
                type="button"
                onClick={() => setPreviewBatch(null)}
                className="bg-white border border-gray-200 hover:bg-gray-50 text-[#0B1726] text-[10px] font-bold px-4 py-2 rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

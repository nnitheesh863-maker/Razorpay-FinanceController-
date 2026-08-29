import { apiClient as axiosInstance } from './axios';

// Legacy exports for compile compatibility
export const previewImportFile = async (type: string, file: File) => {
  const formData = new FormData();
  formData.append('type', type);
  formData.append('file', file);
  const response = await axiosInstance.post('/imports/preview', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const submitImportRecords = async (type: string, records: any[]) => {
  const response = await axiosInstance.post('/imports/submit', { type, records });
  return response.data;
};

// 1. Upload file to Data Center
export const uploadImportFile = async (category: string, file: File) => {
  const formData = new FormData();
  formData.append('category', category);
  formData.append('file', file);

  const response = await axiosInstance.post('/imports/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// 2. Get list of import batches
export const getImportBatches = async () => {
  const response = await axiosInstance.get('/imports');
  return response.data;
};

// 3. Get import batch details by ID
export const getImportBatchById = async (id: string) => {
  const response = await axiosInstance.get(`/imports/${id}`);
  return response.data;
};

// 4. Get raw record previews
export const getImportBatchPreview = async (id: string) => {
  const response = await axiosInstance.get(`/imports/${id}/preview`);
  return response.data;
};

// 5. Normalize raw records of an import batch
export const normalizeImportBatch = async (id: string, mapping: Record<string, string>, recordType: string) => {
  const response = await axiosInstance.post(`/imports/${id}/normalize`, { mapping, recordType });
  return response.data;
};

// 6. Get Data Center Ingestion Statistics
export const getImportStats = async () => {
  const response = await axiosInstance.get('/imports/stats');
  return response.data;
};

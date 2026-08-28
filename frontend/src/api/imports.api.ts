import { apiClient as axiosInstance } from './axios';

export const previewImportFile = async (type: string, file: File) => {
  const formData = new FormData();
  formData.append('type', type);
  formData.append('file', file);

  const response = await axiosInstance.post('/imports/preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

export const submitImportRecords = async (type: string, records: any[]) => {
  const response = await axiosInstance.post('/imports/submit', { type, records });
  return response.data;
};

import { useState, useEffect } from 'react';
import { fileService } from '../services/file.service';

interface FileData {
  id: string;
  filename: string;
  original_filename?: string;
  file_type: string;
  file_category: string;
  file_category_display: string;
  file_size?: number;
  processing_status: string;
  processing_progress?: number;
  processing_error?: string;
  content_quality_score?: number;
  extraction_confidence?: number;
  upload_at?: string;
  processed_at?: string;
  image_width?: number;
  image_height?: number;
  color_mode?: string;
  video_width?: number;
  video_height?: number;
  duration?: number;
  frame_rate?: string;
  video_codec?: string;
  audio_codec?: string;
  mime_type?: string;
  encoding?: string;
  checksum?: string;
  minio_object_name: string;
  thumbnail_path?: string;
  preview_content?: string;
  extracted_text?: string;
  file_metadata?: any;
  extraction_metadata?: any;
  is_supported_preview: boolean;
  preview_type: string;
  page_count?: number;
  word_count?: number;
}

export const useFileDetails = (libraryId: string, fileId: string) => {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFileDetails = async () => {
    if (!libraryId || !fileId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fileService.getFileDetails(libraryId, fileId);
      setFileData(response.data);
    } catch (err: any) {
      console.error('获取文件详情失败:', err);
      setError(err.message || '获取文件详情失败');
    } finally {
      setLoading(false);
    }
  };

  const refreshFile = () => {
    fetchFileDetails();
  };

  useEffect(() => {
    fetchFileDetails();
  }, [libraryId, fileId]);

  return {
    fileData,
    loading,
    error,
    refreshFile
  };
};
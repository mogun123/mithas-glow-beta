import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { r2Storage } from '../services/r2Storage';

interface FileUploadState {
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  uploadedFiles: Array<{
    url: string;
    key: string;
    name: string;
    size: number;
    type: string;
  }>;
}

interface FileUploadActions {
  uploadFile: (file: File) => Promise<string | null>;
  uploadMultipleFiles: (files: File[]) => Promise<string[]>;
  cancelUpload: () => void;
  clearError: () => void;
  clearFiles: () => void;
  getPreviewUrl: (file: File) => Promise<string>;
  formatFileSize: (bytes: number) => string;
}

export function useFileUpload(): FileUploadState & FileUploadActions {
  const [state, setState] = useState<FileUploadState>({
    isUploading: false,
    uploadProgress: 0,
    error: null,
    uploadedFiles: [],
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!file) {
      toast.error('No file selected');
      return null;
    }

    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      setState(prev => ({ ...prev, error: validationError }));
      return null;
    }

    // Create abort controller for this upload
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isUploading: true,
      uploadProgress: 0,
      error: null,
    }));

    try {
      let result;
      
      // Upload based on file type
      if (r2Storage.isImageFile(file)) {
        result = await r2Storage.uploadImage(file);
      } else if (r2Storage.isVideoFile(file)) {
        result = await r2Storage.uploadVideo(file);
      } else if (r2Storage.isAudioFile(file)) {
        result = await r2Storage.uploadAudio(file);
      } else {
        result = await r2Storage.uploadFile(file);
      }

      const uploadedFile = {
        url: result.url,
        key: result.key,
        name: file.name,
        size: file.size,
        type: file.type,
      };

      setState(prev => ({
        ...prev,
        uploadedFiles: [...prev.uploadedFiles, uploadedFile],
        isUploading: false,
        uploadProgress: 100,
      }));

      toast.success(`${file.name} uploaded successfully`);
      return result.url;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
      }));
      toast.error(errorMessage);
      return null;
    }
  }, []);

  const uploadMultipleFiles = useCallback(async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    
    setState(prev => ({ ...prev, isUploading: true, uploadProgress: 0 }));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = await uploadFile(file);
      if (url) {
        urls.push(url);
      }
      
      // Update progress
      const progress = ((i + 1) / files.length) * 100;
      setState(prev => ({ ...prev, uploadProgress: progress }));
    }

    return urls;
  }, [uploadFile]);

  const cancelUpload = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isUploading: false,
      uploadProgress: 0,
    }));
    
    toast.info('Upload cancelled');
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const clearFiles = useCallback(() => {
    setState(prev => ({
      ...prev,
      uploadedFiles: [],
      uploadProgress: 0,
    }));
  }, []);

  const getPreviewUrl = useCallback(async (file: File): Promise<string> => {
    return r2Storage.getPreviewUrl(file);
  }, []);

  const formatFileSize = useCallback((bytes: number): string => {
    return r2Storage.formatFileSize(bytes);
  }, []);

  return {
    ...state,
    uploadFile,
    uploadMultipleFiles,
    cancelUpload,
    clearError,
    clearFiles,
    getPreviewUrl,
    formatFileSize,
  };
}

// Helper function for file validation
function validateFile(file: File): string | null {
  // Check file size (max 100MB for any file)
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    return 'File size must be less than 100MB';
  }

  // Check file type
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    // Videos
    'video/mp4', 'video/mov', 'video/avi', 'video/webm',
    // Audio
    'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a',
    // Documents
    'application/pdf', 'text/plain', 
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(file.type)) {
    return 'File type not supported';
  }

  return null;
}

// Hook for handling drag and drop
export function useDragAndDrop(onFilesDropped: (files: File[]) => void) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFilesDropped(files);
    }
  }, [onFilesDropped]);

  return {
    isDragOver,
    dragProps: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}

// Hook for file selection
export function useFileSelect(onFilesSelected: (files: File[]) => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesSelected]);

  return {
    selectFiles,
    fileInputRef,
    fileInputProps: {
      ref: fileInputRef,
      type: 'file',
      multiple: true,
      accept: 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt',
      onChange: handleFileSelect,
      style: { display: 'none' },
    },
  };
}

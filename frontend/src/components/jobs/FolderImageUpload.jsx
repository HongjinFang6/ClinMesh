import React, { useState, useCallback } from 'react';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/tiff'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 100;
const PREVIEW_BATCH_SIZE = 10;

export const FolderImageUpload = ({ onFilesSelect, onProcessingModeChange, onJobNameChange }) => {
  const [uploadMode, setUploadMode] = useState('single');
  const [processingMode, setProcessingMode] = useState('individual');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState(new Map());
  const [invalidFiles, setInvalidFiles] = useState([]);
  const [isGeneratingPreviews, setIsGeneratingPreviews] = useState(false);
  const [warnings, setWarnings] = useState([]);
  const [jobName, setJobName] = useState('');

  const validateFiles = useCallback((fileList) => {
    const valid = [];
    const invalid = [];
    const warns = [];

    Array.from(fileList).forEach(file => {
      if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
        invalid.push({ name: file.name, reason: 'Invalid file type' });
      } else if (file.size > MAX_FILE_SIZE) {
        invalid.push({ name: file.name, reason: 'File too large (>10MB)' });
      } else {
        valid.push(file);
      }
    });

    if (valid.length > MAX_FILES) {
      warns.push(`Folder contains ${valid.length} images. Only the first ${MAX_FILES} will be processed.`);
      return { valid: valid.slice(0, MAX_FILES), invalid, warnings: warns };
    }

    return { valid, invalid, warnings: warns };
  }, []);

  const generatePreview = useCallback((file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        resolve(null);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const generatePreviewsBatch = useCallback(async (files) => {
    setIsGeneratingPreviews(true);
    const previewMap = new Map();

    for (let i = 0; i < files.length; i += PREVIEW_BATCH_SIZE) {
      const batch = files.slice(i, i + PREVIEW_BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (file) => ({
          name: file.name,
          url: await generatePreview(file)
        }))
      );

      results.forEach(({ name, url }) => {
        if (url) previewMap.set(name, url);
      });

      setPreviews(new Map(previewMap));
    }

    setIsGeneratingPreviews(false);
  }, [generatePreview]);

  const handleFileChange = useCallback(async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      setWarnings(['No valid image files found in the selected folder']);
      return;
    }

    const { valid, invalid, warnings: validationWarnings } = validateFiles(fileList);

    if (valid.length === 0) {
      setWarnings(['No valid image files found. Please select a folder containing image files (PNG, JPG, GIF, etc.)']);
      setSelectedFiles([]);
      setPreviews(new Map());
      setInvalidFiles(invalid);
      onFilesSelect([]);
      return;
    }

    setSelectedFiles(valid);
    setInvalidFiles(invalid);
    setWarnings(validationWarnings);

    if (invalid.length > 0) {
      const skippedMessage = `${invalid.length} non-image file${invalid.length > 1 ? 's were' : ' was'} skipped`;
      setWarnings(prev => [...prev, skippedMessage]);
    }

    await generatePreviewsBatch(valid);
    onFilesSelect(valid);
  }, [validateFiles, generatePreviewsBatch, onFilesSelect]);

  const handleRemoveFile = useCallback((fileName) => {
    const updated = selectedFiles.filter(f => f.name !== fileName);
    setSelectedFiles(updated);

    const newPreviews = new Map(previews);
    newPreviews.delete(fileName);
    setPreviews(newPreviews);

    onFilesSelect(updated);
  }, [selectedFiles, previews, onFilesSelect]);

  const handleUploadModeChange = useCallback((mode) => {
    setUploadMode(mode);
    setSelectedFiles([]);
    setPreviews(new Map());
    setInvalidFiles([]);
    setWarnings([]);
    onFilesSelect([]);
  }, [onFilesSelect]);

  const handleProcessingModeChange = useCallback((mode) => {
    setProcessingMode(mode);
    onProcessingModeChange(mode);
  }, [onProcessingModeChange]);

  const handleJobNameChange = useCallback((e) => {
    const name = e.target.value;
    setJobName(name);
    if (onJobNameChange) {
      onJobNameChange(name);
    }
  }, [onJobNameChange]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Upload Mode Selector */}
      <div className="flex gap-4 items-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="uploadMode"
            value="single"
            checked={uploadMode === 'single'}
            onChange={() => handleUploadModeChange('single')}
            className="w-4 h-4"
          />
          <span className="font-medium">Single Image</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="uploadMode"
            value="folder"
            checked={uploadMode === 'folder'}
            onChange={() => handleUploadModeChange('folder')}
            className="w-4 h-4"
          />
          <span className="font-medium">Folder Upload</span>
        </label>
      </div>

      {/* File Input */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <input
          type="file"
          accept="image/*"
          {...(uploadMode === 'folder' && { webkitdirectory: '', directory: '', multiple: true })}
          {...(uploadMode === 'single' && {})}
          onChange={handleFileChange}
          className="hidden"
          id="folder-image-upload"
        />
        <label htmlFor="folder-image-upload" className="cursor-pointer">
          <div className="text-gray-600">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {uploadMode === 'folder' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              )}
            </svg>
            <p className="mt-2">
              {uploadMode === 'folder' ? 'Click to select folder' : 'Click to upload image'}
            </p>
            <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
            {uploadMode === 'folder' && (
              <p className="text-xs text-gray-400 mt-1">Maximum 100 images per folder</p>
            )}
          </div>
        </label>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          {warnings.map((warning, idx) => (
            <p key={idx} className="text-yellow-800 text-sm">{warning}</p>
          ))}
        </div>
      )}

      {/* Invalid Files */}
      {invalidFiles.length > 0 && invalidFiles.length <= 5 && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-800 text-sm font-medium mb-1">Skipped files:</p>
          <ul className="text-red-700 text-xs list-disc list-inside">
            {invalidFiles.map((file, idx) => (
              <li key={idx}>{file.name} - {file.reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Job Name Input */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <label htmlFor="job-name" className="block text-sm font-medium text-gray-700">
            {selectedFiles.length > 1 && processingMode === 'individual'
              ? 'Job Name Prefix (Optional)'
              : 'Job Name (Optional)'}
          </label>
          <input
            type="text"
            id="job-name"
            value={jobName}
            onChange={handleJobNameChange}
            placeholder={
              selectedFiles.length > 1 && processingMode === 'individual'
                ? 'e.g., "Patient Study" - will create "Patient Study - image1.jpg", etc.'
                : selectedFiles.length === 1
                  ? 'e.g., "X-Ray Analysis"'
                  : 'e.g., "Batch Analysis"'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">
            {selectedFiles.length > 1 && processingMode === 'individual'
              ? 'A prefix for auto-generated names (combined with filename)'
              : 'Give this job a descriptive name for easy identification'}
          </p>
        </div>
      )}

      {/* Processing Mode Selector (only for multiple files) */}
      {selectedFiles.length > 1 && (
        <div className="border rounded-lg p-4 bg-blue-50">
          <h3 className="font-semibold mb-3 text-gray-800">How would you like to process these images?</h3>
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded border hover:border-blue-400 transition-colors">
              <input
                type="radio"
                name="processingMode"
                value="individual"
                checked={processingMode === 'individual'}
                onChange={() => handleProcessingModeChange('individual')}
                className="w-4 h-4 mt-1"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900">Individual Processing (Recommended)</span>
                <p className="text-sm text-gray-600">{selectedFiles.length} separate jobs - One output per image, works with any model</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded border border-yellow-300 hover:border-yellow-400 transition-colors">
              <input
                type="radio"
                name="processingMode"
                value="batch"
                checked={processingMode === 'batch'}
                onChange={() => handleProcessingModeChange('batch')}
                className="w-4 h-4 mt-1"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900">Batch Processing (Advanced)</span>
                <p className="text-sm text-gray-600">All {selectedFiles.length} images in one job - Only works if your model handles multiple inputs</p>
                <p className="text-xs text-yellow-700 mt-1">⚠️ Your model must be coded to process multiple files</p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Preview Grid */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} selected
            </p>
            {isGeneratingPreviews && (
              <p className="text-sm text-gray-500">Generating previews...</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-96 overflow-y-auto p-2 border rounded-lg bg-gray-50">
            {selectedFiles.map((file) => (
              <div key={file.name} className="relative group border rounded-lg overflow-hidden bg-white shadow-sm">
                {previews.get(file.name) ? (
                  <img
                    src={previews.get(file.name)}
                    alt={file.name}
                    className="w-full h-24 object-cover"
                  />
                ) : (
                  <div className="w-full h-24 bg-gray-200 animate-pulse flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="p-2">
                  <p className="text-xs font-medium text-gray-700 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={() => handleRemoveFile(file.name)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

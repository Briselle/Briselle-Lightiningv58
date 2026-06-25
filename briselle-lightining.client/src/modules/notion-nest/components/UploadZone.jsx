import React, { useState, useRef } from 'react';
import { Upload, Link as LinkIcon } from 'lucide-react';

export default function UploadZone({
  onSelect,
  accept = "*",
  placeholderText = "Drag & drop file here",
  subtext = "or click to select a file",
  allowLink = false,
  onlyLink = false
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      onSelect(ev.target.result, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleLinkSubmit = (e) => {
    e.preventDefault();
    if (linkUrl.trim()) {
      onSelect(linkUrl.trim());
      setLinkUrl('');
    }
  };

  if (onlyLink) {
    return (
      <div className="nn-upload-container link-only-mode" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleLinkSubmit} className="nn-upload-link-form" style={{ marginTop: 0 }}>
          <div className="nn-upload-link-input-wrapper">
            <LinkIcon size={14} className="nn-upload-link-icon" />
            <input
              type="text"
              placeholder="Paste link here..."
              className="nn-upload-link-input"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="nn-upload-link-btn" disabled={!linkUrl.trim()}>
            Embed
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="nn-upload-container" onClick={e => e.stopPropagation()}>
      <div
        className={`nn-upload-zone${isDragOver ? ' dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept={accept}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <Upload size={22} className="nn-upload-icon" />
        <span className="nn-upload-text">{placeholderText}</span>
        <small className="nn-upload-subtext">{subtext}</small>
      </div>

      {allowLink && (
        <form onSubmit={handleLinkSubmit} className="nn-upload-link-form">
          <div className="nn-upload-link-input-wrapper">
            <LinkIcon size={14} className="nn-upload-link-icon" />
            <input
              type="text"
              placeholder="Paste a link..."
              className="nn-upload-link-input"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>
          <button type="submit" className="nn-upload-link-btn" disabled={!linkUrl.trim()}>
            Embed
          </button>
        </form>
      )}
    </div>
  );
}

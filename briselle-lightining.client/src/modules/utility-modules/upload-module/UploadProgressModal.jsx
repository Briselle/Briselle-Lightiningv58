/* ============================================================
   Briselle Enterprise Platform — Utility Modules
   upload-module / UploadProgressModal.jsx
   Google Photos Style Upload Progress Card
   ============================================================ */

import React, { useState } from 'react';
import { CheckCircle2, Loader2, Video, FileText, Image as ImageIcon, Music, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react';

export function UploadProgressModal({ items = [], onCancel, onClose }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!items || items.length === 0) return null;

  const activeUploads = items.filter(i => i.status === 'uploading');
  const completedUploads = items.filter(i => i.status === 'completed');
  const errorUploads = items.filter(i => i.status === 'error');
  const totalCount = items.length;
  const currentStep = Math.min(completedUploads.length + 1, totalCount);

  // Calculate average overall progress percentage
  const totalProgress = Math.round(
    items.reduce((acc, item) => acc + (item.status === 'completed' ? 100 : item.progress || 0), 0) / totalCount
  );

  const activeItem = activeUploads[0] || errorUploads[0] || items[items.length - 1];
  const thumbnail = activeItem?.thumbnailUrl;

  const getIcon = (type) => {
    if (type?.startsWith('image/')) return <ImageIcon size={18} className="text-blue-500" />;
    if (type?.startsWith('video/')) return <Video size={18} className="text-purple-500" />;
    if (type?.startsWith('audio/')) return <Music size={18} className="text-green-500" />;
    return <FileText size={18} className="text-gray-500" />;
  };

  return (
    <div
      className="gp-upload-card"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '380px',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.16), 0 2px 6px rgba(0, 0, 0, 0.08)',
        zIndex: 99999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        border: errorUploads.length > 0 ? '1px solid #f87171' : '1px solid #e5e7eb',
        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Header section */}
      <div style={{ padding: '20px', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, paddingRight: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '500', color: errorUploads.length > 0 ? '#d93025' : '#5f6368' }}>
              {activeUploads.length > 0 ? `${currentStep} of ${totalCount}` : errorUploads.length > 0 ? 'Upload halted with error' : 'All uploads completed'}
            </span>
            <h3 style={{ margin: '6px 0 14px 0', fontSize: '18px', fontWeight: '600', color: '#202124', lineHeight: '1.3' }}>
              {activeUploads.length > 0 ? `Backing up items (${totalProgress}%)` : errorUploads.length > 0 ? 'Upload size limit exceeded' : 'Backup complete'}
            </h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              {activeUploads.length > 0 && onCancel && (
                <button
                  onClick={onCancel}
                  style={{
                    backgroundColor: '#1a73e8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                  }}
                >
                  Stop
                </button>
              )}
              {errorUploads.length > 0 && onClose && (
                <button
                  onClick={onClose}
                  style={{
                    backgroundColor: '#d93025',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                  }}
                >
                  Dismiss
                </button>
              )}
              <button
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  backgroundColor: 'transparent',
                  color: '#3c4043',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '8px 14px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {collapsed ? 'Show details' : 'Show less'}
                {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </button>
            </div>
          </div>

          {/* Top Right Thumbnail Box */}
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#f1f3f4',
              border: errorUploads.length > 0 ? '1px solid #fca5a5' : '1px solid #dadce0',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {thumbnail ? (
              <img src={thumbnail} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              getIcon(activeItem?.type)
            )}
          </div>
        </div>

        {/* Smooth Top Progress Bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: '100%',
            height: '4px',
            backgroundColor: '#e8eaed'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${totalProgress}%`,
              backgroundColor: errorUploads.length > 0 ? '#d93025' : totalProgress >= 100 ? '#34a853' : '#1a73e8',
              transition: 'width 0.3s ease-out'
            }}
          />
        </div>
      </div>

      {/* Expandable Details Body */}
      {!collapsed && (
        <div
          style={{
            maxHeight: '220px',
            overflowY: 'auto',
            borderTop: '1px solid #f1f3f4',
            padding: '12px 16px',
            backgroundColor: '#fafafa'
          }}
        >
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid #f1f3f4'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }}
                  />
                ) : (
                  getIcon(item.type)
                )}
                <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#202124',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {item.name}
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#70757a' }}>
                    {(item.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>

              {/* Status Loader / Checkmark / Size Error Alert */}
              <div style={{ flexShrink: 0 }}>
                {item.status === 'uploading' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#1a73e8', fontWeight: '600' }}>{item.progress}%</span>
                    <Loader2 size={18} className="animate-spin text-blue-600" />
                  </div>
                ) : item.status === 'completed' ? (
                  <CheckCircle2 size={20} style={{ color: '#1a73e8', fill: '#1a73e8' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#d93025' }}>
                      <AlertCircle size={14} />
                      <span style={{ fontSize: '12px', fontWeight: '600' }}>Failed</span>
                    </div>
                    {item.errorText && (
                      <span style={{ fontSize: '10px', color: '#d93025', maxWidth: '200px', textAlign: 'right', lineHeight: '1.2', marginTop: '2px' }}>
                        {item.errorText}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default UploadProgressModal;

/* ============================================================
   Ziva AI Chat Module — components/ZivaApiSettingsModal.jsx
   Centralized AI API Provider Configuration & Routing Modal
   Created At: 2026-08-02 | Briselle Enterprise Platform
   ============================================================ */

import React, { useState, useEffect } from 'react';
import {
  ZivaApiRouterService,
  PREDEFINED_PROVIDERS,
  PREDEFINED_MODULE_SCOPES
} from '../zivaApiRouterService';
import '../ZivaApiSettings.css';

export default function ZivaApiSettingsModal({ isOpen, onClose }) {
  const [providers, setProviders] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState(null);

  // Form state
  const [providerSource, setProviderSource] = useState('grok');
  const [name, setName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [selectedScopes, setSelectedScopes] = useState(['ziva_chat']);

  useEffect(() => {
    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  function loadProviders() {
    const list = ZivaApiRouterService.getProviders();
    setProviders(list);
  }

  function handleSelectSource(sourceId) {
    setProviderSource(sourceId);
    const predefined = PREDEFINED_PROVIDERS.find(p => p.id === sourceId);
    if (predefined) {
      setName(predefined.name);
      setBaseUrl(predefined.defaultBaseUrl);
      setSelectedScopes(predefined.defaultScopes);
    } else {
      setName('Custom AI Provider');
      setBaseUrl('');
      setSelectedScopes(['ziva_chat']);
    }
  }

  function handleStartAdd() {
    setIsEditing(true);
    setEditingProviderId(null);
    handleSelectSource('grok');
    setApiKey('');
  }

  function handleStartEdit(provider) {
    setIsEditing(true);
    setEditingProviderId(provider.id);
    setProviderSource(provider.providerSource || 'custom');
    setName(provider.name);
    setApiKey(provider.apiKey || '');
    setBaseUrl(provider.baseUrl || '');
    setSelectedScopes(provider.scopes || []);
  }

  function handleToggleScope(scopeId) {
    if (selectedScopes.includes(scopeId)) {
      setSelectedScopes(selectedScopes.filter(s => s !== scopeId));
    } else {
      setSelectedScopes([...selectedScopes, scopeId]);
    }
  }

  function handleSaveForm(e) {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a provider name.');
      return;
    }

    const predefined = PREDEFINED_PROVIDERS.find(p => p.id === providerSource);
    const models = predefined ? predefined.models : [{ id: 'custom-model', name: `${name} Model`, type: 'chat' }];

    ZivaApiRouterService.saveProvider({
      id: editingProviderId || `provider_${Date.now()}`,
      providerSource,
      name: name.trim(),
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      active: true,
      scopes: selectedScopes.length > 0 ? selectedScopes : ['ziva_chat'],
      models
    });

    setIsEditing(false);
    loadProviders();
  }

  function handleToggleActive(providerId) {
    ZivaApiRouterService.toggleActive(providerId);
    loadProviders();
  }

  function handleDeleteProvider(providerId) {
    if (window.confirm('Are you sure you want to remove this API provider configuration?')) {
      ZivaApiRouterService.deleteProvider(providerId);
      loadProviders();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="ziva-settings-modal-overlay" onClick={onClose}>
      <div className="ziva-settings-modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ziva-settings-modal-header">
          <div className="ziva-settings-header-title">
            <div className="ziva-settings-header-icon">
              <i className="fas fa-cog" />
            </div>
            <div>
              <h3>AI API Key Configuration & Routing</h3>
              <p>Manage provider API keys and link impacted platform module scopes</p>
            </div>
          </div>
          <button type="button" className="ziva-settings-close-btn" onClick={onClose} aria-label="Close settings">
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Body */}
        <div className="ziva-settings-modal-body">
          {/* Action Bar */}
          {!isEditing && (
            <div className="ziva-settings-action-bar">
              <span style={{ fontSize: '13px', color: '#54698d' }}>
                Configured API Providers ({providers.length})
              </span>
              <button type="button" className="ziva-settings-add-btn" onClick={handleStartAdd}>
                <i className="fas fa-plus" /> Add New API Provider
              </button>
            </div>
          )}

          {/* Add / Edit Form Card */}
          {isEditing && (
            <form className="ziva-provider-form-card" onSubmit={handleSaveForm}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                  {editingProviderId ? 'Edit API Provider' : 'Configure New API Provider'}
                </strong>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '12px' }}
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
              </div>

              {/* Provider Source Dropdown */}
              <div className="ziva-form-group">
                <label className="ziva-form-label">Provider Source</label>
                <select
                  className="ziva-form-select"
                  value={providerSource}
                  onChange={e => handleSelectSource(e.target.value)}
                >
                  {PREDEFINED_PROVIDERS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Provider Name */}
              <div className="ziva-form-group">
                <label className="ziva-form-label">Configuration Name</label>
                <input
                  type="text"
                  className="ziva-form-input"
                  placeholder="e.g. Grok Production Key"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              {/* API Key */}
              <div className="ziva-form-group">
                <label className="ziva-form-label">API Key</label>
                <input
                  type="password"
                  className="ziva-form-input"
                  placeholder="gsk_... or sk-..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                />
              </div>

              {/* Base URL (Optional / Custom) */}
              <div className="ziva-form-group">
                <label className="ziva-form-label">Base URL (Endpoint API Gateway)</label>
                <input
                  type="text"
                  className="ziva-form-input"
                  placeholder="https://api.groq.com/openai/v1"
                  value={baseUrl}
                  onChange={e => setBaseUrl(e.target.value)}
                />
              </div>

              {/* Module Scope Tags */}
              <div className="ziva-form-group">
                <label className="ziva-form-label">Link Impacted Module Scopes (Tags)</label>
                <div className="ziva-scopes-container">
                  {PREDEFINED_MODULE_SCOPES.map(scope => {
                    const isSelected = selectedScopes.includes(scope.id);
                    return (
                      <div
                        key={scope.id}
                        className={`ziva-scope-chip ${isSelected ? 'selected' : ''}`}
                        onClick={() => handleToggleScope(scope.id)}
                        title={scope.description}
                      >
                        {scope.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="ziva-form-actions">
                <button type="button" className="ziva-btn-secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="ziva-btn-primary">
                  <i className="fas fa-check" style={{ marginRight: '6px' }} /> Save Configuration
                </button>
              </div>
            </form>
          )}

          {/* Configured Providers List */}
          <div className="ziva-providers-list">
            {providers.map(p => (
              <div key={p.id} className="ziva-provider-item-card">
                <div className="ziva-provider-info">
                  <div className="ziva-provider-title-row">
                    <h4>{p.name}</h4>
                    <span className={`ziva-provider-status-badge ${p.active ? 'active' : 'inactive'}`}>
                      {p.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="ziva-provider-key-preview">
                    {p.apiKey ? `Key: ${p.apiKey.slice(0, 7)}••••••••` : '⚠️ No Key Configured'}
                    {p.baseUrl ? ` | ${p.baseUrl}` : ''}
                  </div>
                  {/* Scope Tag Badges */}
                  <div className="ziva-provider-tags">
                    {Array.isArray(p.scopes) && p.scopes.map(s => {
                      const match = PREDEFINED_MODULE_SCOPES.find(m => m.id === s);
                      return (
                        <span key={s} className="ziva-provider-tag">
                          🏷️ {match ? match.label.split(' (')[0] : s}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="ziva-provider-item-actions">
                  <button
                    type="button"
                    className="ziva-icon-action-btn"
                    onClick={() => handleToggleActive(p.id)}
                    title={p.active ? 'Deactivate Provider' : 'Activate Provider'}
                  >
                    <i className={`fas ${p.active ? 'fa-toggle-on' : 'fa-toggle-off'}`} style={{ color: p.active ? '#10b981' : '#64748b' }} />
                  </button>
                  <button
                    type="button"
                    className="ziva-icon-action-btn"
                    onClick={() => handleStartEdit(p)}
                    title="Edit Provider"
                  >
                    <i className="fas fa-edit" />
                  </button>
                  <button
                    type="button"
                    className="ziva-icon-action-btn delete"
                    onClick={() => handleDeleteProvider(p.id)}
                    title="Delete Provider"
                  >
                    <i className="fas fa-trash-alt" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="ziva-settings-modal-footer">
          <span>💡 Configured API keys route automatically to linked modules in Briselle Platform.</span>
          <button type="button" className="ziva-btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

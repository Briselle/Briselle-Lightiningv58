/* ============================================================
   NotionNest — blocks/SubPageBlock.jsx
   Created At: 2026-07-20 | Last Modified: 2026-07-20
   Previous Version Back URL: file:///c:/BriselleServer/Briselle-Lightiningv58/briselle-lightining.client/src/modules/notion-nest/blocks.jsx#L2245
   ============================================================ */
import { useEffect, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageContext } from '../core/PageContext';
import { useAuthStore } from '../../../stores/authStore';
import { listNotionPages, createNotionNestRecord, notionNestPagePath } from '../core/notionNestPageStorage';

export const SubPageBlock = memo(function SubPageBlock({ block }) {
  const { updateBlockProperty, auditData } = usePageContext();
  const navigate = useNavigate();
  const currentUser = useAuthStore(s => s.user);
  const [siblingPages, setSiblingPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customPageId, setCustomPageId] = useState('');
  const [customObjId, setCustomObjId] = useState('');

  const dobjId = auditData?.dobjId;
  const currentDdataId = auditData?.ddataId;
  const objectRouteId = auditData?.objectRouteId || String(dobjId || '');
  const actorId = currentUser?.id || currentUser?.sys_user_id || 1;

  useEffect(() => {
    if (!block.subPageId && dobjId) {
      listNotionPages(dobjId).then(pages => {
        setSiblingPages(pages.filter(p => p.id !== currentDdataId));
      });
    }
  }, [block.subPageId, dobjId, currentDdataId]);

  const handleSelectPage = (id, title) => {
    updateBlockProperty(block.id, 'subPageId', id);
    updateBlockProperty(block.id, 'pageTitle', title);
  };

  const handleCreateNew = async () => {
    if (!dobjId) return;
    setLoading(true);
    const title = prompt("Enter new sub-page title:") || "Untitled Subpage";
    const res = await createNotionNestRecord({
      dobjId,
      title,
      actorId,
    });
    setLoading(false);
    if (res.recordId) {
      updateBlockProperty(block.id, 'subPageId', res.recordId);
      updateBlockProperty(block.id, 'pageTitle', title);
    } else {
      alert("Failed to create sub-page: " + res.error);
    }
  };

  const handleLinkCustom = () => {
    const targetRecId = Number(customPageId);
    if (!targetRecId) return;
    const targetObj = customObjId || objectRouteId;
    updateBlockProperty(block.id, 'subPageId', targetRecId);
    updateBlockProperty(block.id, 'targetObjectId', targetObj);
    updateBlockProperty(block.id, 'pageTitle', block.pageTitle || `Page #${targetRecId}`);
  };

  if (block.subPageId) {
    const targetObj = block.targetObjectId || objectRouteId;
    return (
      <div className="block-content">
        <div className="sub-page-link" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '6px', padding: '4px 8px', borderRadius: '4px' }}
          onMouseOver={e => e.currentTarget.style.backgroundColor = '#f3f2f1'}
          onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
          onClick={() => navigate(notionNestPagePath(targetObj, block.subPageId))}
        >
          <span className="sub-page-icon" style={{ fontSize: '18px' }}>📄</span>
          <span className="sub-page-title" style={{ fontWeight: 500, textDecoration: 'underline', color: 'var(--notion-sf-brand, rgb(1, 118, 211))' }}>
            {block.pageTitle || `Page #${block.subPageId}`}
          </span>
          <button
            type="button"
            className="sub-page-unlink-btn"
            style={{ marginLeft: '12px', background: 'none', border: 'none', color: '#706e6b', cursor: 'pointer', fontSize: '11px' }}
            onClick={(e) => {
              e.stopPropagation();
              updateBlockProperty(block.id, 'subPageId', undefined);
              updateBlockProperty(block.id, 'targetObjectId', undefined);
            }}
          >
            Unlink
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="block-content" style={{ padding: '8px', border: '1px dashed #dddbda', borderRadius: '6px', background: '#fafafa', fontSize: '13px' }}>
      <div style={{ fontWeight: 600, marginBottom: '6px' }}>Link Sub-page</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {siblingPages.length > 0 && (
          <div>
            <span style={{ marginRight: '6px' }}>Select sibling page:</span>
            <select
              style={{ padding: '2px 4px', borderRadius: '3px', border: '1px solid #dddbda' }}
              onChange={e => {
                const opt = e.target.selectedOptions[0];
                if (opt.value) handleSelectPage(Number(opt.value), opt.text);
              }}
              defaultValue=""
            >
              <option value="" disabled>-- select a page --</option>
              {siblingPages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{ padding: '4px 8px', background: 'var(--notion-sf-brand, rgb(1, 118, 211))', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            onClick={handleCreateNew}
            disabled={loading}
          >
            {loading ? 'Creating...' : '+ Create & Link New Sibling Page'}
          </button>
          <span>or</span>
          <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Record ID"
              value={customPageId}
              onChange={e => setCustomPageId(e.target.value)}
              style={{ width: '80px', padding: '2px 4px', border: '1px solid #dddbda', borderRadius: '3px' }}
            />
            <input
              type="text"
              placeholder="Obj ID (optional)"
              value={customObjId}
              onChange={e => setCustomObjId(e.target.value)}
              style={{ width: '100px', padding: '2px 4px', border: '1px solid #dddbda', borderRadius: '3px' }}
            />
            <button
              type="button"
              style={{ padding: '4px 8px', background: '#f3f2f1', border: '1px solid #dddbda', borderRadius: '4px', cursor: 'pointer' }}
              onClick={handleLinkCustom}
            >
              Link Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

const OG_TIMEOUT = 8000;

async function fetchOGData(url) {
  try {
    const resp = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}&force=true`, { signal: AbortSignal.timeout(OG_TIMEOUT) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.data) return null;
    return {
      title: data.data.title || '',
      description: data.data.description || '',
      favicon: data.data.logo?.url || data.data.favicon?.url || '',
    };
  } catch { return null; }
}

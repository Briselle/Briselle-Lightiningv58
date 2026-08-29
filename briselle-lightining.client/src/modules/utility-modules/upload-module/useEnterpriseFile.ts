/* ============================================================
   Briselle Enterprise Platform — Utility Modules
   upload-module / useEnterpriseFile.ts
   Hook to query enterprise_files DB table before loading media
   ============================================================ */

import { useState, useEffect } from 'react';
import { FileService } from './FileService';

function extractUuid(val?: string | null): string {
  if (!val) return '';
  const match = String(val).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : String(val);
}

export function useEnterpriseFile(fileIdOrUrl: string | undefined | null) {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [metadata, setMetadata] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (!fileIdOrUrl) {
      setResolvedUrl('');
      setMetadata(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const cleanUuid = extractUuid(fileIdOrUrl);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // If external link (e.g. Unsplash / YouTube embed / HTTP URL) AND not containing DAM UUID, return directly
    if (
      typeof fileIdOrUrl === 'string' &&
      !uuidRegex.test(cleanUuid) &&
      (fileIdOrUrl.startsWith('http://') ||
        fileIdOrUrl.startsWith('https://') ||
        fileIdOrUrl.startsWith('data:'))
    ) {
      setResolvedUrl(fileIdOrUrl);
      setLoading(false);
      return;
    }

    // Input is DAM fileId -> Query enterprise_files DB table with clean UUID
    FileService.getSignedUrl(cleanUuid)
      .then(async (url) => {
        if (isMounted) {
          if (url) {
            setResolvedUrl(url);
            const meta = await FileService.getFileMetadata(cleanUuid);
            setMetadata(meta);
          } else {
            console.warn(`🔒 useEnterpriseFile: Access denied or soft-deleted for fileId: ${cleanUuid}`);
            setResolvedUrl('');
            setMetadata(null);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('useEnterpriseFile error:', err);
          setResolvedUrl('');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fileIdOrUrl]);

  return { resolvedUrl, loading, metadata };
}

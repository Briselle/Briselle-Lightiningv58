/** Shared grid clipboard: same HTML/TSV as cell-range copy; plus Markdown pipe table. */

const CLIPBOARD_TABLE_BORDER = '#e5e7eb';

export function escapeHtmlForClipboard(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeMarkdownCell(s: string): string {
    return String(s)
        .replace(/\|/g, '\\|')
        .replace(/\r?\n/g, ' ')
        .replace(/\t/g, ' ');
}

/**
 * @param cols — column keys in display order (e.g. visible data columns).
 */
export function buildClipboardGridPayload(
    rows: Record<string, unknown>[],
    cols: string[],
    fieldMappings: Record<string, string>,
): { tsv: string; html: string; markdown: string } {
    const headers = cols.map((c) => fieldMappings[c] ?? c);
    const tsvLines = [
        headers.join('\t'),
        ...rows.map((row) =>
            cols
                .map((c) =>
                    String(row[c] ?? '')
                        .replace(/\r?\n/g, ' ')
                        .replace(/\t/g, ' '),
                )
                .join('\t'),
        ),
    ];
    const cellStyle = `border:1px solid ${CLIPBOARD_TABLE_BORDER};padding:4px 8px;vertical-align:top;`;
    const tableStyle = `border-collapse:collapse;border:1px solid ${CLIPBOARD_TABLE_BORDER};font-family:system-ui,sans-serif;font-size:12px;background:#fff;`;
    const th = headers
        .map((h) => `<th style="${cellStyle}background:#f9fafb;">${escapeHtmlForClipboard(h)}</th>`)
        .join('');
    const trs = rows
        .map((row) => {
            const tds = cols
                .map((c) => `<td style="${cellStyle}">${escapeHtmlForClipboard(String(row[c] ?? ''))}</td>`)
                .join('');
            return `<tr>${tds}</tr>`;
        })
        .join('');
    const html = `<table style="${tableStyle}"><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;

    const mdHeader = '| ' + headers.map((h) => escapeMarkdownCell(h)).join(' | ') + ' |';
    const mdSep = '| ' + headers.map(() => '---').join(' | ') + ' |';
    const mdRows = rows.map(
        (row) => '| ' + cols.map((c) => escapeMarkdownCell(String(row[c] ?? ''))).join(' | ') + ' |',
    );
    const markdown = [mdHeader, mdSep, ...mdRows].join('\n');

    return { tsv: tsvLines.join('\n'), html, markdown };
}

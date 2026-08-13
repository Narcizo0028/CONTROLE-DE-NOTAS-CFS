'use client';

import { useState, useMemo, ReactNode } from 'react';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  sortable?: boolean;
}

interface DataTableProps<T extends object> {
  data: T[];
  columns: Column<T>[];
  searchKeys?: string[];
  pageSize?: number;
  onExport?: () => void;
  emptyMessage?: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  getRowId?: (item: T) => string;
}

function cellValue(item: object, key: string): unknown {
  return (item as Record<string, unknown>)[key];
}

export default function DataTable<T extends object>({
  data,
  columns,
  searchKeys = [],
  pageSize = 10,
  onExport,
  emptyMessage = 'Nenhum registro encontrado',
  selectedIds = [],
  onSelectionChange,
  getRowId,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = [...data];
    if (search && searchKeys.length > 0) {
      const q = search.toLowerCase();
      result = result.filter((item) =>
        searchKeys.some((key) => String(cellValue(item, key) ?? '').toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = cellValue(a, sortKey);
        const bVal = cellValue(b, sortKey);
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = String(aVal).localeCompare(String(bVal), 'pt-BR', { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [data, search, searchKeys, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selectable = Boolean(onSelectionChange && getRowId);
  const pageIds = selectable ? paginated.map((item) => getRowId!(item)) : [];
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(selectedIds.includes(id) ? selectedIds.filter((selectedId) => selectedId !== id) : [...selectedIds, id]);
  };

  const togglePage = () => {
    if (!onSelectionChange) return;
    onSelectionChange(allPageSelected ? selectedIds.filter((id) => !pageIds.includes(id)) : Array.from(new Set([...selectedIds, ...pageIds])));
  };

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-10"
          />
        </div>
        {onExport && (
          <button onClick={onExport} className="btn-secondary">
            <Download size={16} /> Exportar
          </button>
        )}
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {selectable && <th className="w-10"><input type="checkbox" aria-label="Selecionar todos desta página" checked={allPageSelected} onChange={togglePage} /></th>}
              {columns.map((col) => (
                <th key={col.key}>
                  {col.sortable !== false ? (
                    <button
                      className="flex items-center gap-1 hover:text-gray-900"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {sortKey === col.key && (sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                    </button>
                  ) : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8 text-gray-500">{emptyMessage}</td></tr>
            ) : (
              paginated.map((item, idx) => (
                <tr key={idx}>
                  {selectable && <td><input type="checkbox" aria-label="Selecionar registro" checked={selectedIds.includes(getRowId!(item))} onChange={() => toggleRow(getRowId!(item))} /></td>}
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(item) : String(cellValue(item, col.key) ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{filtered.length} registro(s) — Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="btn-secondary px-2 py-1">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="btn-secondary px-2 py-1">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

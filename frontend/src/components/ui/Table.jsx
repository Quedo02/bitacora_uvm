// components/ui/Table.jsx
import { useMemo, useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function Table({
  columns = [],
  rows = [],
  defaultSort = null,
  actions = { show: true },
  onSave,
  onDelete,
  onEditStart,
  onEditCancel
}) {
  const getValue = (row, accessor) => {
    if (!accessor) return undefined;
    if (typeof accessor === 'function') return accessor(row);
    const parts = String(accessor).split('.');
    let v = row;
    for (const p of parts) {
      if (v == null) return undefined;
      v = v[p];
    }
    return v;
  };

  const setValue = (obj, accessor, value) => {
    if (!accessor || typeof accessor === 'function') return;
    const parts = String(accessor).split('.');
    let cur = obj;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      if (i === parts.length - 1) cur[p] = value;
      else {
        if (cur[p] == null) cur[p] = {};
        cur = cur[p];
      }
    }
  };

  // sorting
  const initialSort = useMemo(() => {
    if (defaultSort && defaultSort.accessor) {
      return {
        accessor: defaultSort.accessor,
        direction: defaultSort.direction === 'desc' ? 'desc' : 'asc'
      };
    }
    const first = columns.find(c => c.sortable !== false && c.accessor);
    if (first) return { accessor: first.accessor, direction: 'asc' };
    return null;
  }, [columns, defaultSort]);

  const [sort, setSort] = useState(initialSort);
  useEffect(() => setSort(initialSort), [initialSort]);

  const comparator = (a, b, accessor) => {
    const va = getValue(a, accessor);
    const vb = getValue(b, accessor);
    if (va == null && vb == null) return 0;
    if (va == null) return -1;
    if (vb == null) return 1;
    const na = Number(va),
      nb = Number(vb);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    const sa = String(va).toLowerCase(),
      sb = String(vb).toLowerCase();
    if (sa < sb) return -1;
    if (sa > sb) return 1;
    return 0;
  };

  const sortedRows = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    if (!sort || !sort.accessor) return rows;
    const copy = [...rows];
    copy.sort((x, y) => {
      const cmp = comparator(x, y, sort.accessor);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort]);

  const onHeaderClick = (col) => {
    if (col.sortable === false) return;
    const accessor = col.accessor;
    if (!accessor) return;
    setSort(prev => {
      if (!prev || prev.accessor !== accessor) return { accessor, direction: 'asc' };
      return { accessor, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const renderSortIcon = (col) => {
    if (!sort || sort.accessor !== col.accessor) return null;
    return sort.direction === 'asc' ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  };

  // inline edit
  const [editingId, setEditingId] = useState(null);
  const [editedRow, setEditedRow] = useState(null);

  const startEdit = (row) => {
    setEditingId(row.id ?? null);
    setEditedRow(JSON.parse(JSON.stringify(row || {})));
    if (onEditStart) onEditStart(row);
  };

  const cancelEdit = (row) => {
    setEditingId(null);
    setEditedRow(null);
    if (onEditCancel) onEditCancel(row);
  };

  const handleChange = (accessor, value) => {
    setEditedRow(prev => {
      const copy = JSON.parse(JSON.stringify(prev || {}));
      setValue(copy, accessor, value);
      return copy;
    });
  };

  const handleSave = async () => {
    if (!editingId) return;
    if (onSave) await onSave(editingId, editedRow);
    setEditingId(null);
    setEditedRow(null);
  };

  const handleDelete = async (id) => {
    if (!id) return;
    if (onDelete) await onDelete(id);
  };

  // build effective columns: add actions column if needed
  const effectiveColumns = useMemo(() => {
    const cols = [...columns];
    if (actions?.show !== false) {
      cols.push({
        header: 'Acciones',
        key: '__actions',
        sortable: false,
        accessor: null,
        width: '160px',
        // por defecto también se puede truncar, pero aquí
        // queremos que los botones se vean bien
        truncate: false,
        cell: (row) => {
          const isEditing = editingId === (row.id ?? null);
          if (isEditing) {
            return (
              <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center rounded-md bg-brand-red px-2 py-1 text-xs font-medium text-brand-white hover:bg-brand-wine"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={() => cancelEdit(row)}
                  className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              </div>
            );
          }
          return (
            <div className="flex items-center justify-end gap-2 whitespace-nowrap">
              <button
                type="button"
                onClick={() => startEdit(row)}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => handleDelete(row.id)}
                className="inline-flex items-center rounded-md bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          );
        }
      });
    }
    return cols;
  }, [columns, actions, editingId, editedRow, onDelete, onSave]);

  const tableStyle = {
    width: '100%',
    tableLayout: 'fixed', // esto ayuda a que respete los anchos
    borderCollapse: 'collapse'
  };

  const thStyleBase = {
    textAlign: 'left',
    padding: '0.65rem',
    verticalAlign: 'middle',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  };

  const tdStyleBase = {
    padding: '0.6rem',
    verticalAlign: 'middle',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
    overflow: 'hidden' // 🔥 clave para que no se monte sobre otras celdas
  };

  return (
    <table
      style={tableStyle}
      className="min-w-full text-left text-sm text-slate-800"
    >
      <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <tr>
          {effectiveColumns.map((c, i) => {
            const isId = c.accessor === 'id' || c.key === 'id';
            return (
              <th
                key={c.key ?? c.accessor ?? i}
                role={c.sortable === false ? undefined : 'button'}
                onClick={() => onHeaderClick(c)}
                style={{
                  ...thStyleBase,
                  cursor: c.sortable === false ? 'default' : 'pointer',
                  userSelect: 'none',
                  width: c.width ?? (isId ? '72px' : undefined),
                  maxWidth: c.width ?? (isId ? '72px' : undefined),
                  textAlign: isId ? 'center' : undefined
                }}
              >
                <div className="inline-flex items-center gap-1.5">
                  <span className="overflow-hidden text-ellipsis">
                    {c.header}
                  </span>
                  <span className="inline-flex items-center">
                    {renderSortIcon(c)}
                  </span>
                </div>
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {sortedRows.map((r, ri) => {
          const isEditing = editingId === (r.id ?? null);
          return (
            <tr
              key={r.id ?? ri}
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
            >
              {effectiveColumns.map((c, ci) => {
                const key = c.key ?? c.accessor ?? ci;
                const isId = c.accessor === 'id' || c.key === 'id';
                const cellCommonStyle = {
                  ...tdStyleBase,
                  width: c.width ?? (isId ? '72px' : undefined),
                  maxWidth: c.width ?? (isId ? '72px' : undefined),
                  textAlign: isId ? 'center' : undefined
                };
                const shouldTruncate = c.truncate !== false;

                // Columna de acciones
                if (c.key === '__actions' && typeof c.cell === 'function') {
                  return (
                    <td
                      key={key}
                      style={{ ...cellCommonStyle, overflow: 'visible' }}
                    >
                      {c.cell(r)}
                    </td>
                  );
                }

                // Modo edición
                if (isEditing && c.editable) {
                  const val = getValue(editedRow, c.accessor);

                  if (c.cellEditor && typeof c.cellEditor === 'function') {
                    return (
                      <td
                        key={key}
                        style={{ ...cellCommonStyle, overflow: 'visible' }}
                      >
                        <div className="min-w-0">
                          {c.cellEditor({
                            value: val,
                            onChange: (v) => handleChange(c.accessor, v),
                            row: editedRow
                          })}
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={key}
                      style={{ ...cellCommonStyle, overflow: 'visible' }}
                    >
                      <input
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800 shadow-sm focus:border-brand-red focus:outline-none focus:ring-1 focus:ring-brand-red"
                        value={val ?? ''}
                        onChange={(e) => handleChange(c.accessor, e.target.value)}
                      />
                    </td>
                  );
                }

                // Celdas con render personalizado
                if (typeof c.cell === 'function') {
                  const content = c.cell(r);
                  if (!shouldTruncate) {
                    return (
                      <td key={key} style={cellCommonStyle}>
                        {content}
                      </td>
                    );
                  }
                  return (
                    <td key={key} style={cellCommonStyle}>
                      <div className="min-w-0 truncate">{content}</div>
                    </td>
                  );
                }

                // Celdas "planas"
                const plain = getValue(r, c.accessor);
                const plainString = plain != null ? String(plain) : '';

                if (!shouldTruncate) {
                  return (
                    <td key={key} style={cellCommonStyle} title={plainString}>
                      {plainString}
                    </td>
                  );
                }

                return (
                  <td key={key} style={cellCommonStyle} title={plainString}>
                    <div className="min-w-0 truncate">{plainString}</div>
                  </td>
                );
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

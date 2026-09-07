import React from 'react';
import { Button } from './Button';

/**
 * Accessible Table Shell per design.md §5.12
 * - Row height standard 48px
 * - Semantic table markup
 * - Row hover & focus states
 * - Right-aligned numeric columns
 * - Empty state support
 * - Pagination controls
 */
export function Table({
  columns = [],
  data = [],
  keyField = 'id',
  emptyMessage = 'No records found matching current criteria.',
  pagination = null,
  className = '',
}) {
  return (
    <div
      className={`table-container ${className}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
      }}
    >
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'left',
            fontSize: 'var(--font-size-base)',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--color-background)',
                borderBottom: '1px solid var(--color-border)',
              }}
            >
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    textAlign: col.align || 'left',
                    whiteSpace: 'nowrap',
                    width: col.width || 'auto',
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: 'var(--space-8) var(--space-4)',
                    textAlign: 'center',
                    color: 'var(--color-muted)',
                    fontSize: 'var(--font-size-sm)',
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row[keyField] || rowIdx}
                  tabIndex={0}
                  style={{
                    height: 'var(--table-row-height)',
                    borderBottom:
                      rowIdx === data.length - 1 ? 'none' : '1px solid var(--color-border)',
                    transition: 'background-color var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.backgroundColor = '#F1F5F9';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      style={{
                        padding: 'var(--space-2) var(--space-4)',
                        textAlign: col.align || 'left',
                        color: 'var(--color-text)',
                        fontSize: 'var(--font-size-sm)',
                        verticalAlign: 'middle',
                      }}
                    >
                      {col.render ? col.render(row[col.key], row, rowIdx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div
          style={{
            padding: 'var(--space-3) var(--space-4)',
            borderTop: '1px solid var(--color-border)',
            backgroundColor: 'var(--color-background)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-muted)',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          <div>
            Showing <strong>{pagination.from || 1}</strong> to{' '}
            <strong>{pagination.to || data.length}</strong> of{' '}
            <strong>{pagination.total || data.length}</strong> entries
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button
              size="sm"
              variant="secondary"
              disabled={pagination.currentPage <= 1}
              onClick={pagination.onPrev}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={pagination.onNext}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;


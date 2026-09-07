import React from 'react';

/**
 * Administrative Card surface per design.md §5.11
 * Features formal border, crisp white surface, and no consumer gradients/glows.
 */
export function Card({
  title,
  subtitle,
  headerAction,
  children,
  className = '',
  style = {},
  ...props
}) {
  const hasHeader = title || subtitle || headerAction;

  return (
    <div
      className={`card ${className}`}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
        ...style,
      }}
      {...props}
    >
      {hasHeader && (
        <div
          style={{
            padding: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            {title && (
              <h3
                style={{
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 600,
                  color: 'var(--color-primary)',
                  marginBottom: subtitle ? '2px' : 0,
                }}
              >
                {title}
              </h3>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--color-muted)',
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div style={{ padding: 'var(--space-4)' }}>{children}</div>
    </div>
  );
}

export default Card;


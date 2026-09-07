import React from 'react';

/**
 * Reusable Button component per design.md §5.37
 * Variants: primary, secondary, sensitive (destructive/escalate)
 * Focus states use --color-focus per §5.48
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  isLoading = false,
  onClick,
  className = '',
  ...props
}) {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    fontFamily: 'var(--font-family-base)',
    fontWeight: 500,
    fontSize: size === 'sm' ? 'var(--font-size-sm)' : 'var(--font-size-base)',
    height: size === 'sm' ? '32px' : size === 'lg' ? '48px' : 'var(--btn-height)',
    paddingLeft: size === 'sm' ? 'var(--space-3)' : 'var(--space-4)',
    paddingRight: size === 'sm' ? 'var(--space-3)' : 'var(--space-4)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid transparent',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    opacity: disabled || isLoading ? 0.6 : 1,
    transition: 'background-color var(--transition-fast), border-color var(--transition-fast)',
    textDecoration: 'none',
  };

  const variantStyles = {
    primary: {
      backgroundColor: 'var(--color-primary)',
      color: '#FFFFFF',
      borderColor: 'var(--color-primary)',
    },
    secondary: {
      backgroundColor: 'var(--color-surface)',
      color: 'var(--color-text)',
      borderColor: 'var(--color-border)',
    },
    sensitive: {
      backgroundColor: 'var(--color-error)',
      color: '#FFFFFF',
      borderColor: 'var(--color-error)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--color-primary)',
      borderColor: 'var(--color-primary)',
    },
  };

  const combinedStyles = {
    ...baseStyles,
    ...(variantStyles[variant] || variantStyles.primary),
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      style={combinedStyles}
      className={`btn btn-${variant} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <span
            style={{
              width: '14px',
              height: '14px',
              border: '2px solid currentColor',
              borderRightColor: 'transparent',
              borderRadius: '50%',
              display: 'inline-block',
              animation: 'spin 0.6s linear infinite',
            }}
          />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}

export default Button;


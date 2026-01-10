import React from 'react';
import './Button.css';

/**
 * Button component with multiple variants
 * @param {Object} props
 * @param {'default' | 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'link'} props.variant
 * @param {'default' | 'sm' | 'lg' | 'icon'} props.size
 * @param {boolean} props.disabled
 * @param {boolean} props.loading
 * @param {React.ReactNode} props.children
 */
export function Button({
    variant = 'default',
    size = 'default',
    disabled = false,
    loading = false,
    className = '',
    children,
    ...props
}) {
    const classes = [
        'btn',
        `btn--${variant}`,
        `btn--${size}`,
        loading ? 'btn--loading' : '',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            className={classes}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <span className="btn__spinner">
                    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="10" />
                    </svg>
                </span>
            )}
            <span className={loading ? 'btn__content--hidden' : 'btn__content'}>
                {children}
            </span>
        </button>
    );
}

export default Button;

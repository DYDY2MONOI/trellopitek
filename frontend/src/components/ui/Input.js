import React from 'react';
import './Input.css';

/**
 * Input component
 */
export function Input({
    type = 'text',
    size = 'default',
    error = false,
    className = '',
    leftIcon,
    rightIcon,
    ...props
}) {
    const hasIcon = leftIcon || rightIcon;

    if (hasIcon) {
        return (
            <div className={`input-wrapper input-wrapper--${size} ${error ? 'input-wrapper--error' : ''} ${className}`}>
                {leftIcon && <span className="input-wrapper__icon input-wrapper__icon--left">{leftIcon}</span>}
                <input
                    type={type}
                    className="input input--in-wrapper"
                    {...props}
                />
                {rightIcon && <span className="input-wrapper__icon input-wrapper__icon--right">{rightIcon}</span>}
            </div>
        );
    }

    return (
        <input
            type={type}
            className={`input input--${size} ${error ? 'input--error' : ''} ${className}`}
            {...props}
        />
    );
}

/**
 * Textarea component
 */
export function Textarea({
    error = false,
    className = '',
    ...props
}) {
    return (
        <textarea
            className={`textarea ${error ? 'textarea--error' : ''} ${className}`}
            {...props}
        />
    );
}

/**
 * Search Input with icon
 */
export function SearchInput({
    placeholder = 'Search...',
    className = '',
    ...props
}) {
    return (
        <Input
            type="search"
            placeholder={placeholder}
            className={`search-input ${className}`}
            leftIcon={
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                </svg>
            }
            {...props}
        />
    );
}

export default Input;

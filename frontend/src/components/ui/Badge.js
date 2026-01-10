import React from 'react';
import './Badge.css';

/**
 * Badge component for status labels and tags
 * @param {'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline'} variant
 */
export function Badge({
    variant = 'default',
    size = 'default',
    className = '',
    children,
    ...props
}) {
    return (
        <span
            className={`badge badge--${variant} badge--size-${size} ${className}`}
            {...props}
        >
            {children}
        </span>
    );
}

/**
 * Priority Badge with specific colors
 */
export function PriorityBadge({ priority = 'medium', className = '', ...props }) {
    const priorityMap = {
        high: { label: 'High', variant: 'destructive' },
        medium: { label: 'Medium', variant: 'warning' },
        low: { label: 'Low', variant: 'secondary' },
    };

    const config = priorityMap[priority] || priorityMap.medium;

    return (
        <Badge variant={config.variant} className={`priority-badge ${className}`} {...props}>
            <span className="priority-badge__dot" />
            {config.label}
        </Badge>
    );
}

/**
 * Status Badge with colors
 */
export function StatusBadge({ status = 'active', className = '', ...props }) {
    const statusMap = {
        active: { label: 'Active', variant: 'success' },
        'in-progress': { label: 'In Progress', variant: 'primary' },
        'on-hold': { label: 'On Hold', variant: 'warning' },
        completed: { label: 'Completed', variant: 'secondary' },
        cancelled: { label: 'Cancelled', variant: 'destructive' },
    };

    const config = statusMap[status] || statusMap.active;

    return (
        <Badge variant={config.variant} className={`status-badge ${className}`} {...props}>
            {config.label}
        </Badge>
    );
}

export default Badge;

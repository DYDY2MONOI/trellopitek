import React from 'react';
import './Card.css';

/**
 * Card Container
 */
export function Card({ className = '', hoverable = false, children, ...props }) {
    return (
        <div
            className={`card ${hoverable ? 'card--hoverable' : ''} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}

/**
 * Card Header
 */
export function CardHeader({ className = '', children, ...props }) {
    return (
        <div className={`card__header ${className}`} {...props}>
            {children}
        </div>
    );
}

/**
 * Card Title
 */
export function CardTitle({ as: Tag = 'h3', className = '', children, ...props }) {
    return (
        <Tag className={`card__title ${className}`} {...props}>
            {children}
        </Tag>
    );
}

/**
 * Card Description
 */
export function CardDescription({ className = '', children, ...props }) {
    return (
        <p className={`card__description ${className}`} {...props}>
            {children}
        </p>
    );
}

/**
 * Card Content
 */
export function CardContent({ className = '', children, ...props }) {
    return (
        <div className={`card__content ${className}`} {...props}>
            {children}
        </div>
    );
}

/**
 * Card Footer
 */
export function CardFooter({ className = '', children, ...props }) {
    return (
        <div className={`card__footer ${className}`} {...props}>
            {children}
        </div>
    );
}

export default Card;

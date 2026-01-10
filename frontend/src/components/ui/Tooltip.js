import React, { useState, useRef, useEffect } from 'react';
import './Tooltip.css';

/**
 * Tooltip component
 * @param {'top' | 'bottom' | 'left' | 'right'} position
 */
export function Tooltip({
    content,
    position = 'top',
    delay = 300,
    className = '',
    children
}) {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutRef = useRef(null);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsVisible(false);
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div
            className={`tooltip-wrapper ${className}`}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
            onFocus={showTooltip}
            onBlur={hideTooltip}
        >
            {children}
            {isVisible && content && (
                <div className={`tooltip tooltip--${position}`} role="tooltip">
                    <span className="tooltip__content">{content}</span>
                    <span className="tooltip__arrow" />
                </div>
            )}
        </div>
    );
}

export default Tooltip;

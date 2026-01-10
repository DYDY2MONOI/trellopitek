import React from 'react';
import './ProgressCircle.css';

/**
 * Circular progress indicator
 * @param {number} progress - Progress value 0-100
 * @param {number} size - Size in pixels
 * @param {string} color - CSS color value
 */
export function ProgressCircle({
    progress = 0,
    size = 24,
    strokeWidth = 3,
    color,
    className = ''
}) {
    const normalizedProgress = Math.min(100, Math.max(0, progress));
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (normalizedProgress / 100) * circumference;

    return (
        <div
            className={`progress-circle ${className}`}
            style={{ width: size, height: size }}
        >
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                {/* Background circle */}
                <circle
                    className="progress-circle__bg"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {/* Progress circle */}
                <circle
                    className="progress-circle__progress"
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={color ? { stroke: color } : undefined}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </svg>
        </div>
    );
}

/**
 * Linear Progress Bar
 */
export function ProgressBar({
    progress = 0,
    size = 'default',
    showLabel = false,
    className = ''
}) {
    const normalizedProgress = Math.min(100, Math.max(0, progress));

    return (
        <div className={`progress-bar progress-bar--${size} ${className}`}>
            <div
                className="progress-bar__fill"
                style={{ width: `${normalizedProgress}%` }}
            />
            {showLabel && (
                <span className="progress-bar__label">{Math.round(normalizedProgress)}%</span>
            )}
        </div>
    );
}

export default ProgressCircle;

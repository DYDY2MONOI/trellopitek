import React from 'react';
import './Avatar.css';

/**
 * Avatar component with image and fallback support
 */
export function Avatar({
    src,
    alt = '',
    fallback,
    size = 'default',
    className = '',
    ...props
}) {
    const [hasError, setHasError] = React.useState(false);
    const [isLoaded, setIsLoaded] = React.useState(false);

    const showFallback = !src || hasError;

    const getFallbackText = () => {
        if (fallback) return fallback;
        if (alt) {
            const words = alt.split(' ');
            if (words.length >= 2) {
                return words[0][0] + words[1][0];
            }
            return alt.slice(0, 2);
        }
        return '?';
    };

    return (
        <div className={`avatar avatar--${size} ${className}`} {...props}>
            {!showFallback && (
                <img
                    src={src}
                    alt={alt}
                    className={`avatar__image ${isLoaded ? 'avatar__image--loaded' : ''}`}
                    onError={() => setHasError(true)}
                    onLoad={() => setIsLoaded(true)}
                />
            )}
            {showFallback && (
                <span className="avatar__fallback">
                    {getFallbackText().toUpperCase()}
                </span>
            )}
        </div>
    );
}

/**
 * Avatar Group - Stack multiple avatars
 */
export function AvatarGroup({ children, max = 3, className = '' }) {
    const childArray = React.Children.toArray(children);
    const shown = childArray.slice(0, max);
    const remaining = childArray.length - max;

    return (
        <div className={`avatar-group ${className}`}>
            {shown}
            {remaining > 0 && (
                <div className="avatar avatar--default avatar-group__more">
                    <span className="avatar__fallback">+{remaining}</span>
                </div>
            )}
        </div>
    );
}

export default Avatar;

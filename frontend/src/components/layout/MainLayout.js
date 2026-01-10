import React from 'react';
import './MainLayout.css';

/**
 * Main Layout with Sidebar
 * Provides the basic structure: sidebar + main content area
 */
export function MainLayout({ sidebar, children, className = '' }) {
    return (
        <div className={`main-layout ${className}`}>
            {sidebar}
            <main className="main-layout__content">
                {children}
            </main>
        </div>
    );
}

/**
 * Page Header component
 */
export function PageHeader({
    title,
    description,
    kicker,
    actions,
    className = ''
}) {
    return (
        <header className={`page-header ${className}`}>
            <div className="page-header__content">
                {kicker && <span className="page-header__kicker">{kicker}</span>}
                <h1 className="page-header__title">{title}</h1>
                {description && <p className="page-header__description">{description}</p>}
            </div>
            {actions && (
                <div className="page-header__actions">
                    {actions}
                </div>
            )}
        </header>
    );
}

/**
 * Content container with proper padding
 */
export function PageContent({ children, className = '' }) {
    return (
        <div className={`page-content ${className}`}>
            {children}
        </div>
    );
}

export default MainLayout;

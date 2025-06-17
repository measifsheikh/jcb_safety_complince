import React, { useEffect, useRef } from 'react';
import Toast from './Toast';
import { useToast } from '../../hooks/useToast';
import './ToastContainer.css';

const ToastContainer = ({ 
  position = 'top-right',
  maxToasts = 5,
  pauseOnHover = true,
  reverseOrder = false 
}) => {
  const { toasts, removeToast } = useToast();
  const containerRef = useRef(null);

  // Limit the number of toasts displayed
  const displayedToasts = maxToasts 
    ? toasts.slice(0, maxToasts)
    : toasts;

  // Reverse order for bottom positions if specified
  const orderedToasts = reverseOrder || position.includes('bottom')
    ? [...displayedToasts].reverse()
    : displayedToasts;

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (toasts.length === 0) return;

      // Escape key to close all toasts
      if (event.key === 'Escape') {
        toasts.forEach(toast => removeToast(toast.id));
        return;
      }

      // Arrow keys for navigation (if needed for accessibility)
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const toastElements = containerRef.current?.querySelectorAll('.toast');
        if (toastElements && toastElements.length > 0) {
          const firstToast = toastElements[0];
          const closeButton = firstToast.querySelector('.toast-close');
          if (closeButton) {
            closeButton.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toasts, removeToast]);

  // Auto-focus management for accessibility
  useEffect(() => {
    if (toasts.length > 0 && containerRef.current) {
      const latestToast = containerRef.current.querySelector('.toast:first-child');
      if (latestToast) {
        // Announce to screen readers
        latestToast.setAttribute('aria-live', 'polite');
        latestToast.setAttribute('role', 'status');
      }
    }
  }, [toasts]);

  if (displayedToasts.length === 0) return null;

  return (
    <div 
      ref={containerRef}
      className={`toast-container ${position}`}
      aria-label="Notifications"
      role="region"
    >
      {orderedToasts.map((toast, index) => (
        <Toast 
          key={toast.id} 
          toast={{
            ...toast,
            // Add animation delay based on position in stack
            animationDelay: index * 80
          }} 
          onRemove={removeToast}
          pauseOnHover={pauseOnHover}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
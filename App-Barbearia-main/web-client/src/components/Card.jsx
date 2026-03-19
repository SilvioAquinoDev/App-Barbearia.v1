import React from 'react';
import './Card.css';

export default function Card({ children, className = '', onClick = null }) {
  const Tag = onClick ? 'div' : 'div';
  return (
    <div 
      className={`card ${className}`} 
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      {children}
    </div>
  );
}

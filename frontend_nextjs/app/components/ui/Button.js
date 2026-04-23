'use client';

import React from 'react';
import Link from 'next/link';
import * as Icons from 'lucide-react';

// Definimos las variantes de botón
const variantStyles = {
  primary: 'bg-black text-white hover:bg-gray-800',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  ghost: 'hover:bg-gray-100', // Para botones sin fondo como flechas
};

// Definimos los tamaños
const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg w-14 h-14',  // ← Agrega esto
  icon: 'w-10 h-10', // Cuadrado para solo icono
  iconSm: 'w-8 h-8', // Cuadrado pequeño para flechas
};

const Button = ({
  icon,
  texto,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  soloIcono = false,
  type = 'button',
  disabled = false,
  className = '',
  ...props
}) => {
  const IconComponent = icon ? Icons[icon] : null;
  
  const baseClasses = 'rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/20 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2';
  
  const variantClass = variantStyles[variant] || variantStyles.primary;
  
  let sizeClass;
  if (soloIcono) {
    sizeClass = size === 'sm' ? sizeStyles.iconSm : sizeStyles.icon;
  } else {
    sizeClass = sizeStyles[size];
  }
  
  const buttonContent = (
    <>
      {IconComponent && <IconComponent className={`${soloIcono ? 'w-5 h-5' : 'w-4 h-4'}`} />}
      {texto && <span>{texto}</span>}
    </>
  );
  
  const buttonClassName = `${baseClasses} ${variantClass} ${sizeClass} ${className}`;
  
  if (href) {
    return (
      <Link href={href} className={buttonClassName} {...props}>
        {buttonContent}
      </Link>
    );
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={buttonClassName}
      {...props}
    >
      {buttonContent}
    </button>
  );
};

export default Button;
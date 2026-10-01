'use client';

import React from 'react';
import Link from 'next/link';
import { 
  Trash2, Pencil, Users, Home, Plus, ArrowLeft, 
  Check, X, Calendar, Download, Save, RefreshCw 
} from 'lucide-react';

// Mapa selectivo de iconos para habilitar Tree-Shaking
const ICONOS_MAP = {
  Trash2, Pencil, Users, Home, Plus, ArrowLeft, 
  Check, X, Calendar, Download, Save, RefreshCw
};

// Definimos las variantes de botón
const variantStyles = {
  primary: 'bg-black text-white hover:bg-gray-800',
  secondary: 'bg-gray-600 text-white hover:bg-gray-700',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  ghost: 'hover:bg-gray-100', // Para botones sin fondo como flechas
  blue: 'bg-blue-600 text-white hover:bg-blue-500', // <-- AGREGADO: Azul con hover azul sutil
};

// Definimos los tamaños
const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3.5 text-base md:text-lg',
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
  
  const baseClasses = 'rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black/20 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 cursor-pointer';
  
  const variantClass = variantStyles[variant] || variantStyles.primary;
  
  let sizeClass;
  if (soloIcono) {
    sizeClass = size === 'sm' ? sizeStyles.iconSm : sizeStyles.icon;
  } else {
    sizeClass = sizeStyles[size];
  }

  // Renderizado flexible de icono (soporta string 'Trash2' o componente directo)
  const renderIcono = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    const Componente = typeof icon === 'string' ? ICONOS_MAP[icon] : icon;
    if (!Componente) return null;
    return <Componente className={soloIcono ? 'w-5 h-5' : 'w-4 h-4'} />;
  };
  
  const buttonContent = (
    <>
      {renderIcono()}
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
/**
 * Utility functions for managing Tailwind CSS classes
 */

// Color utility functions
export const getColorClasses = (colorScheme: 'light' | 'dark', variant: 'primary' | 'secondary' | 'accent' | 'background' | 'text' | 'card' | 'border') => {
  const colorMap = {
    light: {
      primary: 'text-blue-500',
      secondary: 'text-green-500',
      accent: 'text-orange-500',
      background: 'bg-gray-50',
      text: 'text-gray-900',
      card: 'bg-white',
      border: 'border-gray-200'
    },
    dark: {
      primary: 'text-blue-400',
      secondary: 'text-green-400',
      accent: 'text-orange-400',
      background: 'bg-gray-900',
      text: 'text-white',
      card: 'bg-gray-800',
      border: 'border-gray-700'
    }
  };

  return colorMap[colorScheme][variant];
};

// Size utility functions
export const getSizeClasses = (size: 'sm' | 'md' | 'lg' | 'xl') => {
  const sizeMap = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  return sizeMap[size];
};

// Button utility functions
export const getButtonClasses = (variant: 'filled' | 'outline' | 'ghost', colorScheme: 'light' | 'dark', size: 'sm' | 'md' | 'lg' = 'md') => {
  const baseClasses = 'flex-row items-center justify-center rounded-lg';
  
  const sizeClasses = {
    sm: 'h-9 px-3',
    md: 'h-11 px-4',
    lg: 'h-14 px-5'
  };

  const variantClasses = {
    filled: colorScheme === 'dark' 
      ? 'bg-zinc-50 text-zinc-900 border-0' 
      : 'bg-zinc-900 text-zinc-50 border-0',
    outline: colorScheme === 'dark' 
      ? 'bg-transparent text-blue-500 border border-zinc-700' 
      : 'bg-transparent text-blue-500 border border-zinc-300',
    ghost: 'bg-transparent text-blue-500 border-0'
  };

  return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`;
};

// Card utility functions
export const getCardClasses = (colorScheme: 'light' | 'dark') => {
  return `bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm shadow-gray-200/50 dark:shadow-gray-800/50`;
};

// Input utility functions
export const getInputClasses = (colorScheme: 'light' | 'dark') => {
  return `bg-white dark:bg-gray-800 text-gray-900 dark:text-white border ${
    colorScheme === 'dark' 
      ? 'border-gray-700 text-white' 
      : 'border-gray-300 text-gray-900'
  } rounded-lg px-4 py-3`;
};

// Conditional class builder
export const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};
// Organized Tailwind utility classes for common styles

// Color definitions
export const colorClasses = {
  // Background colors
  bg: {
    primary: 'bg-blue-500 dark:bg-blue-600',
    secondary: 'bg-gray-100 dark:bg-gray-800',
    success: 'bg-green-500 dark:bg-green-600',
    warning: 'bg-yellow-500 dark:bg-yellow-600',
    error: 'bg-red-500 dark:bg-red-600',
    surface: 'bg-white dark:bg-gray-900',
    card: 'bg-white dark:bg-gray-800',
    overlay: 'bg-black/50',
  },
  // Text colors
  text: {
    primary: 'text-gray-900 dark:text-white',
    secondary: 'text-gray-600 dark:text-gray-300',
    success: 'text-green-500 dark:text-green-400',
    warning: 'text-yellow-500 dark:text-yellow-400',
    error: 'text-red-500 dark:text-red-400',
    muted: 'text-gray-500 dark:text-gray-400',
  },
  // Border colors
  border: {
    primary: 'border-gray-300 dark:border-gray-600',
    success: 'border-green-500 dark:border-green-600',
    warning: 'border-yellow-500 dark:border-yellow-600',
    error: 'border-red-500 dark:border-red-600',
  }
};

// Layout utilities
export const layoutClasses = {
  container: 'flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900',
  content: 'flex-1 p-4',
  card: 'bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm shadow-gray-200/50 dark:shadow-gray-800/50',
  section: 'mb-6',
  row: 'flex flex-row items-center',
  col: 'flex flex-col',
  center: 'items-center justify-center',
  spaceBetween: 'justify-between',
  spaceAround: 'justify-around',
  spaceEvenly: 'justify-evenly',
};

// Spacing utilities
export const spacingClasses = {
  padding: {
    xs: 'p-1',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
    xl: 'p-8',
  },
  margin: {
    xs: 'm-1',
    sm: 'm-2',
    md: 'm-4',
    lg: 'm-6',
    xl: 'm-8',
  },
  paddingX: {
    sm: 'px-2',
    md: 'px-4',
    lg: 'px-6',
    xl: 'px-8',
  },
  paddingY: {
    sm: 'py-2',
    md: 'py-4',
    lg: 'py-6',
    xl: 'py-8',
  },
  marginX: {
    sm: 'mx-2',
    md: 'mx-4',
    lg: 'mx-6',
    xl: 'mx-8',
  },
  marginY: {
    sm: 'my-2',
    md: 'my-4',
    lg: 'my-6',
    xl: 'my-8',
  },
};

// Typography utilities
export const typographyClasses = {
  heading: {
    h1: 'text-3xl font-bold text-gray-900 dark:text-white',
    h2: 'text-2xl font-bold text-gray-900 dark:text-white',
    h3: 'text-xl font-semibold text-gray-900 dark:text-white',
    h4: 'text-lg font-medium text-gray-900 dark:text-white',
  },
  body: {
    large: 'text-lg text-gray-900 dark:text-white',
    medium: 'text-base text-gray-900 dark:text-white',
    small: 'text-sm text-gray-900 dark:text-white',
    xsmall: 'text-xs text-gray-900 dark:text-white',
  },
  weight: {
    light: 'font-light',
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
    extrabold: 'font-extrabold',
  }
};

// Component-specific classes
export const componentClasses = {
  button: {
    base: 'flex flex-row items-center justify-center rounded-lg',
    sizes: {
      sm: 'h-9 px-3 text-sm',
      md: 'h-11 px-4 text-base',
      lg: 'h-14 px-5 text-lg',
    },
    variants: {
      primary: 'bg-blue-500 dark:bg-blue-600 text-white',
      secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white',
      outline: 'border border-blue-500 dark:border-blue-400 text-blue-500 dark:text-blue-400 bg-transparent',
      ghost: 'bg-transparent text-blue-500 dark:text-blue-400',
    },
    disabled: 'opacity-50',
  },
  input: {
    base: 'border rounded-lg px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white',
    error: 'border-red-500 dark:border-red-400',
    success: 'border-green-500 dark:border-green-400',
  },
  badge: {
    base: 'px-2 py-1 rounded-full text-xs font-medium',
    variants: {
      primary: 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200',
      success: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
      warning: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
      error: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
    }
  }
};
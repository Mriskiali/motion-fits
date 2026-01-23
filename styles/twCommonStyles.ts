// Tailwind equivalent of common styles
// This file defines reusable Tailwind class combinations

// Common color palettes
export const twColors = {
  background: 'bg-gray-50 dark:bg-gray-900',
  text: 'text-gray-900 dark:text-white',
  textSecondary: 'text-gray-500 dark:text-gray-400',
  primary: 'text-blue-500 dark:text-blue-400',
  secondary: 'text-green-500 dark:text-green-400',
  accent: 'text-orange-500 dark:text-orange-400',
  card: 'bg-white dark:bg-gray-800',
  highlight: 'text-blue-500 dark:text-blue-400',
};

// Common component styles
export const twClasses = {
  // Container styles
  container: 'flex-1',
  content: 'flex-1 items-center justify-center max-w-800 w-full',
  wrapper: 'bg-gray-50 dark:bg-gray-900 w-full h-full',
  
  // Title styles
  title: 'text-2xl font-800 text-center text-gray-900 dark:text-white mb-2',
  text: 'text-base font-500 text-gray-900 dark:text-white mb-2 leading-6',
  
  // Section styles
  section: 'w-full items-center px-5',
  buttonContainer: 'w-full items-center px-5',
  
  // Card styles
  card: 'bg-white dark:bg-gray-800 rounded-xl p-4 my-2 w-full shadow-sm shadow-gray-200/50 dark:shadow-gray-800/50',
  
  // Icon styles
  icon: 'w-15 h-15',
  
  // Button styles
  instructionsButton: 'bg-blue-500 dark:bg-blue-600 self-center w-full rounded-lg py-3',
  backButton: 'bg-white dark:bg-gray-700 self-center w-full rounded-lg py-3 border border-gray-200 dark:border-gray-600',
};

// Button variants
export const buttonVariants = {
  primary: 'bg-blue-500 dark:bg-blue-600 rounded-lg py-3 px-4',
  secondary: 'bg-gray-200 dark:bg-gray-700 rounded-lg py-3 px-4',
  outline: 'border border-blue-500 dark:border-blue-400 rounded-lg py-3 px-4',
  ghost: 'bg-transparent rounded-lg py-3 px-4',
};
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { IconSymbol } from '../ui/IconSymbol';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    // Optionally navigate to home screen or refresh the app
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
          <View className="p-5 items-center max-w-xs">
            <View className="mb-5">
              <IconSymbol name="exclamationmark.triangle.fill" size={60} color="#ef5350" />
            </View>
            <Text className="text-2xl font-700 text-gray-900 dark:text-white text-center mb-2.5">Something went wrong</Text>
            <Text className="text-base text-gray-500 dark:text-gray-400 text-center mb-7.5 leading-5.5">An unexpected error occurred. Please try again.</Text>

            <View className="flex-row gap-2.5 w-full">
              <TouchableOpacity className="flex-1 bg-gray-50 dark:bg-gray-700 py-3.5 rounded-lg items-center" onPress={this.handleRetry}>
                <Text className="text-base font-600 text-gray-900 dark:text-white">Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-blue-500 dark:bg-blue-600 py-3.5 rounded-lg items-center" onPress={this.handleReset}>
                <Text className="text-base font-600 text-white">Go Home</Text>
              </TouchableOpacity>
            </View>

            {__DEV__ && this.state.error && (
              <View className="mt-5 w-full bg-white dark:bg-gray-800 p-2.5 rounded-2">
                <Text className="text-red-500 text-xs mb-1.25">{this.state.error.toString()}</Text>
                <Text className="text-red-500 text-[10px] font-mono">{this.state.error.stack}</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
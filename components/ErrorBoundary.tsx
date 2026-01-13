import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from './IconSymbol';

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
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <View style={styles.iconContainer}>
              <IconSymbol name="exclamationmark.triangle.fill" size={60} color="#ef5350" />
            </View>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>An unexpected error occurred. Please try again.</Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
                <Text style={styles.buttonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.resetButton} onPress={this.handleReset}>
                <Text style={[styles.buttonText, styles.resetButtonText]}>Go Home</Text>
              </TouchableOpacity>
            </View>
            
            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorText}>{this.state.error.toString()}</Text>
                <Text style={styles.stackText}>{this.state.error.stack}</Text>
              </View>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  retryButton: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  resetButtonText: {
    color: colors.card,
  },
  errorDetails: {
    marginTop: 20,
    width: '100%',
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: '#ef5350',
    fontSize: 12,
    marginBottom: 5,
  },
  stackText: {
    color: '#ef5350',
    fontSize: 10,
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;
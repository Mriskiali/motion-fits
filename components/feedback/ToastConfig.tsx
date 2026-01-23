import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BaseToast, ErrorToast, InfoToast, SuccessToast } from 'react-native-toast-message';

const toastConfig = {
  /*
    Overwrite 'success', 'error', 'info' types 
    with the corresponding component property
  */
  success: (props: any) => (
    <SuccessToast
      {...props}
      style={{ borderLeftColor: '#4CAF50', backgroundColor: '#1E1E1E' }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF'
      }}
      text2Style={{
        fontSize: 14,
        color: '#CCCCCC'
      }}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={{ borderLeftColor: '#F44336', backgroundColor: '#1E1E1E' }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF'
      }}
      text2Style={{
        fontSize: 14,
        color: '#CCCCCC'
      }}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
  info: (props: any) => (
    <InfoToast
      {...props}
      style={{ borderLeftColor: '#2196F3', backgroundColor: '#1E1E1E' }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF'
      }}
      text2Style={{
        fontSize: 14,
        color: '#CCCCCC'
      }}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
  // Custom toast types
  warning: (props: any) => (
    <BaseToast
      {...props}
      style={{ borderLeftColor: '#FF9800', backgroundColor: '#1E1E1E' }}
      text1Style={{
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF'
      }}
      text2Style={{
        fontSize: 14,
        color: '#CCCCCC'
      }}
      text1NumberOfLines={1}
      text2NumberOfLines={2}
    />
  ),
};

export default toastConfig;
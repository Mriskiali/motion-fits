const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Alias expo-keep-awake to a no-op module to prevent "Unable to activate keep awake" errors
config.resolver = {
  ...(config.resolver || {}),
  extraNodeModules: {
    ...(config.resolver?.extraNodeModules || {}),
    'expo-keep-awake': path.join(__dirname, 'utils', 'expo-keep-awake'),
  },
};

// Use turborepo to restore the cache when possible
config.cacheStores = [
    new FileStore({ root: path.join(__dirname, 'node_modules', '.cache', 'metro') }),
  ];
module.exports = config;

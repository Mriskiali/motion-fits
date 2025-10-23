// No-op stub for expo-keep-awake to avoid runtime errors in dev environments without a current Activity.
// This module matches the API surface that Expo's withDevTools requires via `require('expo-keep-awake')`.

const ExpoKeepAwakeTag = 'ExpoKeepAwakeDefaultTag';

function useKeepAwake(_tag, _options) {
  // no-op
}

async function activateKeepAwake(_tag) { /* no-op */ }
async function activateKeepAwakeAsync(_tag) { /* no-op */ }
async function deactivateKeepAwake(_tag) { /* no-op */ }

function addListener(_tagOrListener, _listener) {
  return { remove() {} };
}

async function isAvailableAsync() { return false; }

module.exports = {
  ExpoKeepAwakeTag,
  useKeepAwake,
  activateKeepAwake,
  activateKeepAwakeAsync,
  deactivateKeepAwake,
  addListener,
  isAvailableAsync,
};
let hasPendingSyncFlag = false;
let _isManualSyncTrigger = false;

export const markPendingSync = (): void => {
  hasPendingSyncFlag = true;
};

export const clearPendingSync = (): void => {
  hasPendingSyncFlag = false;
};

export const getHasPendingSync = (): boolean => {
  return hasPendingSyncFlag;
};

export const setManualSyncTrigger = (val: boolean): void => {
  _isManualSyncTrigger = val;
};

export const isManualSyncTrigger = (): boolean => {
  return _isManualSyncTrigger;
};

export const resetSyncStateOnLogout = (): void => {
  hasPendingSyncFlag = false;
  _isManualSyncTrigger = false;
};
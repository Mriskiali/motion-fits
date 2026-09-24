/**
 * Lightweight coordination flag between auth screens and the root Auth Guard.
 *
 * When the user completes sign-in / sign-up we set an optimistic intent and navigate
 * immediately so the transition feels instant. The guard uses this to avoid bouncing
 * the user back to /(auth) during the brief window where Clerk's reactive
 * `isSignedIn` has not flipped yet (which was the cause of the multi-second delay).
 */
let pendingSignedIn = false;
let pendingSignedOut = false;

export const setPendingSignedIn = (value: boolean): void => {
  pendingSignedIn = value;
};

export const isPendingSignedIn = (): boolean => pendingSignedIn;

export const clearPendingSignedIn = (): void => {
  pendingSignedIn = false;
};

export const setPendingSignedOut = (value: boolean): void => {
  pendingSignedOut = value;
};

export const isPendingSignedOut = (): boolean => pendingSignedOut;

export const clearPendingSignedOut = (): void => {
  pendingSignedOut = false;
};

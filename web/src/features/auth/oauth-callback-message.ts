// Shared between the OAuth buttons (the opener, listening) and the
// /auth/oauth-callback route (the popup, posting) to signal completion.
//
// This goes over a BroadcastChannel, not window.opener.postMessage: once the
// popup navigates to the OAuth provider's own page, the provider's own
// Cross-Origin-Opener-Policy header (out of our control, e.g. Google's
// accounts.google.com sends `same-origin`) permanently severs the popup's
// window.opener reference, even after it navigates back to our own origin.
// A same origin BroadcastChannel is keyed by origin only, not by
// window/opener relationships, so it survives that severance where
// postMessage-to-opener cannot.
export const OAUTH_SUCCESS_MESSAGE = "miks:oauth-success"
export const OAUTH_CHANNEL_NAME = "miks:oauth"

// window.open's target name is set once and persists on the popup's
// `window.name` across navigations, even cross-origin ones that sever
// window.opener via COOP. Use this (not window.opener) to tell whether the
// current window is that popup.
export const OAUTH_POPUP_WINDOW_NAME = "miks-oauth-popup"

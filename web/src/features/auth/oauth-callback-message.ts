// Shared between the OAuth buttons (the opener, listening) and the
// /auth/oauth-callback route (the popup, posting). The only thing that ever
// crosses this postMessage boundary is a "done" signal: session cookies are
// already set by the backend callback before the popup lands here.
export const OAUTH_SUCCESS_MESSAGE = "miks:oauth-success"

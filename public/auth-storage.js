const authTokenKey = "turma_do_printy_token";
let memoryToken = "";

function getBrowserStorage(storageName) {
  try {
    return window[storageName] || null;
  } catch {
    return null;
  }
}

export function readLocalStorageValue(key, fallback = "") {
  try {
    return getBrowserStorage("localStorage")?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeLocalStorageValue(key, value) {
  try {
    const storage = getBrowserStorage("localStorage");
    if (!storage) return false;
    storage.setItem(key, value);
    return storage.getItem(key) === String(value);
  } catch {
    return false;
  }
}

export function removeLocalStorageValue(key) {
  try {
    const storage = getBrowserStorage("localStorage");
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function readSessionStorageToken() {
  try {
    return getBrowserStorage("sessionStorage")?.getItem(authTokenKey) || "";
  } catch {
    return "";
  }
}

function writeSessionStorageToken(token) {
  try {
    const storage = getBrowserStorage("sessionStorage");
    if (!storage) return false;
    storage.setItem(authTokenKey, token);
    return storage.getItem(authTokenKey) === token;
  } catch {
    return false;
  }
}

function removeSessionStorageToken() {
  try {
    const storage = getBrowserStorage("sessionStorage");
    if (!storage) return false;
    storage.removeItem(authTokenKey);
    return true;
  } catch {
    return false;
  }
}

function readTokenCookie() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)turma_do_printy_token=([^;]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : "";
  } catch {
    return "";
  }
}

function writeTokenCookie(token) {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${authTokenKey}=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax${secure}`;
    return readTokenCookie() === token;
  } catch {
    return false;
  }
}

function removeTokenCookie() {
  try {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${authTokenKey}=; path=/; max-age=0; SameSite=Lax${secure}`;
    return true;
  } catch {
    return false;
  }
}

export function getAuthToken() {
  if (memoryToken) return memoryToken;

  const localToken = readLocalStorageValue(authTokenKey);
  if (localToken) {
    memoryToken = localToken;
    return localToken;
  }

  const sessionToken = readSessionStorageToken();
  if (sessionToken) {
    memoryToken = sessionToken;
    return sessionToken;
  }

  const cookieToken = readTokenCookie();
  if (cookieToken) {
    memoryToken = cookieToken;
    return cookieToken;
  }

  return "";
}

export function setAuthToken(token) {
  const normalizedToken = String(token || "").trim();
  memoryToken = normalizedToken;

  if (!normalizedToken) {
    removeLocalStorageValue(authTokenKey);
    removeSessionStorageToken();
    removeTokenCookie();
    return true;
  }

  const savedLocally = writeLocalStorageValue(authTokenKey, normalizedToken);
  const savedForTab = writeSessionStorageToken(normalizedToken);
  const savedInCookie = writeTokenCookie(normalizedToken);
  return savedLocally || savedForTab || savedInCookie;
}

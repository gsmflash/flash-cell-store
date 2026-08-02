const SESSION_ID_KEY = 'flashcell:sessionId';

/** Retorna o session_id do visitante, gerando e salvando um na primeira vez. */
export function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function clearSessionId(): void {
  localStorage.removeItem(SESSION_ID_KEY);
}

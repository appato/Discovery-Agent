export interface SessionIdentity {
  sessionId: string;
}

export interface StorageBackend<T extends SessionIdentity> {
  createSession(session: T): Promise<void>;
  getSession(sessionId: string): Promise<T>;
  updateSession(session: T): Promise<void>;
}

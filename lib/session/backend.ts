import fs from 'fs';
import path from 'path';
import { z } from 'zod';

export interface SessionIdentity {
  sessionId: string;
}

export interface StorageBackend<T extends SessionIdentity> {
  createSession(session: T): Promise<void>;
  getSession(sessionId: string): Promise<T>;
  updateSession(session: T): Promise<void>;
}

export class FileSessionBackend<T extends SessionIdentity> implements StorageBackend<T> {
  constructor(
    private dir: string,
    private schema: z.ZodType<T>,
  ) {}

  private ensureDirectory(): void {
    if (!fs.existsSync(this.dir)) {
      fs.mkdirSync(this.dir, { recursive: true });
    }
  }

  private getSessionPath(sessionId: string): string {
    return path.join(this.dir, `${sessionId}.json`);
  }

  async createSession(session: T): Promise<void> {
    this.ensureDirectory();
    fs.writeFileSync(
      this.getSessionPath(session.sessionId),
      JSON.stringify(session, null, 2),
    );
  }

  async getSession(sessionId: string): Promise<T> {
    const filePath = this.getSessionPath(sessionId);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.schema.parse(JSON.parse(content));
  }

  async updateSession(session: T): Promise<void> {
    const filePath = this.getSessionPath(session.sessionId);
    const validated = this.schema.parse(session);
    fs.writeFileSync(filePath, JSON.stringify(validated, null, 2));
  }
}

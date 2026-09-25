import Database from 'better-sqlite3';
import path from 'node:path';

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Todo {
  id: number;
  user_id: number;
  title: string;
  completed: boolean;
  due_date: string | null;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  last_notification_sent: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface Authenticator {
  id: number;
  user_id: number;
  credential_id: string;
  credential_public_key: Buffer;
  counter: number;
  created_at: string;
}

export type ChallengeKind = 'registration' | 'authentication';

export interface CreateTodoInput {
  user_id: number;
  title: string;
  due_date?: string | null;
  priority?: Priority;
  is_recurring?: boolean;
  recurrence_pattern?: RecurrencePattern | null;
  reminder_minutes?: number | null;
}

export interface UpdateTodoInput extends Partial<CreateTodoInput> {
  completed?: boolean;
  last_notification_sent?: string | null;
}

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'todos.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const runSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS authenticators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id TEXT UNIQUE NOT NULL,
    credential_public_key BLOB NOT NULL,
    counter INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_authenticators_user_id ON authenticators(user_id);

  CREATE TABLE IF NOT EXISTS auth_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    kind TEXT NOT NULL,
    challenge TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    UNIQUE(username, kind)
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    due_date TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    last_notification_sent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
  CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date);
`;

db.exec(runSchema);

const userColumns = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
const usersHaveEmailColumn = userColumns.some((column) => column.name === 'email');
const usersHaveUsernameColumn = userColumns.some((column) => column.name === 'username');

if (!usersHaveUsernameColumn && usersHaveEmailColumn) {
  db.exec(`
    ALTER TABLE users ADD COLUMN username TEXT;
    UPDATE users SET username = email WHERE username IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);
}

const createTodoStmt = db.prepare(`
  INSERT INTO todos (
    user_id, title, completed, due_date, priority, is_recurring, recurrence_pattern, reminder_minutes, last_notification_sent, created_at, updated_at
  ) VALUES (
    @user_id, @title, @completed, @due_date, @priority, @is_recurring, @recurrence_pattern, @reminder_minutes, @last_notification_sent, datetime('now'), NULL
  )
`);

const updateTodoStmt = db.prepare(`
  UPDATE todos
  SET
    title = COALESCE(@title, title),
    completed = COALESCE(@completed, completed),
    due_date = COALESCE(@due_date, due_date),
    priority = COALESCE(@priority, priority),
    is_recurring = COALESCE(@is_recurring, is_recurring),
    recurrence_pattern = COALESCE(@recurrence_pattern, recurrence_pattern),
    reminder_minutes = COALESCE(@reminder_minutes, reminder_minutes),
    last_notification_sent = COALESCE(@last_notification_sent, last_notification_sent),
    updated_at = datetime('now')
  WHERE id = @id
`);

const deleteTodoStmt = db.prepare('DELETE FROM todos WHERE id = @id');
const findAllByUserStmt = db.prepare('SELECT * FROM todos WHERE user_id = @user_id ORDER BY completed ASC, priority DESC, due_date IS NULL, due_date ASC, created_at DESC');
const findByIdStmt = db.prepare('SELECT * FROM todos WHERE id = @id');
const findByUserAndIdStmt = db.prepare('SELECT * FROM todos WHERE id = @id AND user_id = @user_id');

export const todoDB = {
  create(input: CreateTodoInput): Todo {
    const normalized = {
      user_id: input.user_id,
      title: input.title.trim(),
      completed: 0,
      due_date: input.due_date ?? null,
      priority: input.priority ?? 'medium',
      is_recurring: input.is_recurring ? 1 : 0,
      recurrence_pattern: input.recurrence_pattern ?? null,
      reminder_minutes: input.reminder_minutes ?? null,
      last_notification_sent: null,
    };

    const result = createTodoStmt.run(normalized);
    return this.findById(Number(result.lastInsertRowid)) as Todo;
  },

  findAllByUser(userId: number): Todo[] {
    return findAllByUserStmt.all({ user_id: userId }) as Todo[];
  },

  findById(id: number): Todo | null {
    const row = findByIdStmt.get({ id }) as Todo | undefined;
    return row ?? null;
  },

  findByUserAndId(userId: number, id: number): Todo | null {
    const row = findByUserAndIdStmt.get({ user_id: userId, id }) as Todo | undefined;
    return row ?? null;
  },

  update(id: number, input: UpdateTodoInput): Todo {
    const updates: Record<string, unknown> = { id };
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.completed !== undefined) updates.completed = input.completed ? 1 : 0;
    if (input.due_date !== undefined) updates.due_date = input.due_date ?? null;
    if (input.priority !== undefined) updates.priority = input.priority;
    if (input.is_recurring !== undefined) updates.is_recurring = input.is_recurring ? 1 : 0;
    if (input.recurrence_pattern !== undefined) updates.recurrence_pattern = input.recurrence_pattern ?? null;
    if (input.reminder_minutes !== undefined) updates.reminder_minutes = input.reminder_minutes ?? null;
    if (input.last_notification_sent !== undefined) updates.last_notification_sent = input.last_notification_sent ?? null;
    updateTodoStmt.run(updates);
    return this.findById(id) as Todo;
  },

  delete(id: number): void {
    deleteTodoStmt.run({ id });
  },
};

export const userDB = {
  findByUsername(username: string): User | null {
    return (db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined) ?? null;
  },

  findById(id: number): User | null {
    return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined) ?? null;
  },

  create(username: string): User {
    const result = usersHaveEmailColumn
      ? db.prepare('INSERT INTO users (username, email) VALUES (?, ?)').run(username, username)
      : db.prepare('INSERT INTO users (username) VALUES (?)').run(username);
    const user = this.findById(Number(result.lastInsertRowid));
    if (!user) throw new Error('Failed to create user');
    return user;
  },
};

export const authenticatorDB = {
  findByCredentialId(credentialId: string): Authenticator | null {
    return (db.prepare('SELECT * FROM authenticators WHERE credential_id = ?').get(credentialId) as Authenticator | undefined) ?? null;
  },

  findByUserId(userId: number): Authenticator[] {
    return db.prepare('SELECT * FROM authenticators WHERE user_id = ? ORDER BY id').all(userId) as Authenticator[];
  },

  create(input: Omit<Authenticator, 'id' | 'created_at'>): Authenticator {
    const result = db.prepare(`
      INSERT INTO authenticators (user_id, credential_id, credential_public_key, counter)
      VALUES (?, ?, ?, ?)
    `).run(input.user_id, input.credential_id, input.credential_public_key, input.counter ?? 0);
    return db.prepare('SELECT * FROM authenticators WHERE id = ?').get(Number(result.lastInsertRowid)) as Authenticator;
  },

  updateCounter(id: number, counter: number): void {
    db.prepare('UPDATE authenticators SET counter = ? WHERE id = ?').run(counter ?? 0, id);
  },
};

export const challengeDB = {
  save(username: string, kind: ChallengeKind, challenge: string, expiresAt: number): void {
    db.prepare(`
      INSERT INTO auth_challenges (username, kind, challenge, expires_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(username, kind) DO UPDATE SET challenge = excluded.challenge, expires_at = excluded.expires_at
    `).run(username, kind, challenge, expiresAt);
  },

  get(username: string, kind: ChallengeKind, now = Date.now()): string | null {
    const record = db.prepare(`
      SELECT challenge, expires_at
      FROM auth_challenges
      WHERE username = ? AND kind = ?
    `).get(username, kind) as { challenge: string; expires_at: number } | undefined;
    return record && record.expires_at > now ? record.challenge : null;
  },

  consumeExpected(username: string, kind: ChallengeKind, expectedChallenge: string, now = Date.now()): boolean {
    const consume = db.transaction(() => {
      const result = db.prepare(`
        DELETE FROM auth_challenges
        WHERE username = ? AND kind = ? AND challenge = ? AND expires_at > ?
      `).run(username, kind, expectedChallenge, now);
      return result.changes === 1;
    });
    return consume();
  },
  consume(username: string, kind: ChallengeKind, now = Date.now()): string | null {
    const consume = db.transaction(() => {
      const record = db.prepare(`
        SELECT id, challenge, expires_at
        FROM auth_challenges
        WHERE username = ? AND kind = ?
      `).get(username, kind) as { id: number; challenge: string; expires_at: number } | undefined;

      if (!record) return null;
      db.prepare('DELETE FROM auth_challenges WHERE id = ?').run(record.id);
      return record.expires_at > now ? record.challenge : null;
    });

    return consume();
  },
};

export function resetDatabaseForTests(): void {
  db.exec('DELETE FROM auth_challenges; DELETE FROM authenticators; DELETE FROM todos; DELETE FROM users;');
}

export { db };

import Database from 'better-sqlite3';
import path from 'node:path';
import { singaporeTimestamp } from '@/lib/timezone';

export type Priority = 'high' | 'medium' | 'low';
export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type { ReminderMinutes } from '@/lib/reminders';

export const PRIORITY_VALUES: Priority[] = ['high', 'medium', 'low'];
export const PRIORITY_ORDER: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const RECURRENCE_PATTERNS: RecurrencePattern[] = ['daily', 'weekly', 'monthly', 'yearly'];

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
  subtasks?: Subtask[];
  tags?: Tag[];
}

export interface Tag {
  id: number;
  user_id: number;
  name: string;
  color: string;
  created_at: string;
}

export interface Template {
  id: number;
  user_id: number;
  name: string;
  title: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_pattern: RecurrencePattern | null;
  reminder_minutes: number | null;
  due_offset_minutes: number | null;
  subtasks_json: string;
  created_at: string;
}

export interface Holiday {
  id: number;
  date: string;
  name: string;
}

export interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: boolean;
  position: number;
  created_at: string;
}

export interface CreateSubtaskDto {
  title: string;
}

export interface UpdateSubtaskDto {
  title?: string;
  completed?: boolean;
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

  CREATE TABLE IF NOT EXISTS subtasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_subtasks_todo_id ON subtasks(todo_id);

  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, name)
  );

  CREATE TABLE IF NOT EXISTS todo_tags (
    todo_id INTEGER NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (todo_id, tag_id)
  );

  CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
  CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    title TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'medium',
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurrence_pattern TEXT,
    reminder_minutes INTEGER,
    due_offset_minutes INTEGER,
    subtasks_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);

  CREATE TABLE IF NOT EXISTS holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
  );
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

const deleteTodoStmt = db.prepare('DELETE FROM todos WHERE id = @id');
const findAllByUserStmt = db.prepare(`
  SELECT * FROM todos
  WHERE user_id = @user_id
  ORDER BY completed ASC,
    CASE priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END ASC,
    due_date IS NULL,
    due_date ASC,
    created_at DESC
`);
const findByIdStmt = db.prepare('SELECT * FROM todos WHERE id = @id');
const findByUserAndIdStmt = db.prepare('SELECT * FROM todos WHERE id = @id AND user_id = @user_id');
const findSubtasksByTodoStmt = db.prepare('SELECT * FROM subtasks WHERE todo_id = @todo_id ORDER BY position ASC, id ASC');
const findSubtaskStmt = db.prepare('SELECT * FROM subtasks WHERE id = @id');
const createSubtaskStmt = db.prepare(`
  INSERT INTO subtasks (todo_id, title, completed, position)
  VALUES (@todo_id, @title, 0, (SELECT COALESCE(MAX(position), -1) + 1 FROM subtasks WHERE todo_id = @todo_id))
`);
const findTagsByTodoStmt = db.prepare(`
  SELECT tags.* FROM tags
  INNER JOIN todo_tags ON todo_tags.tag_id = tags.id
  WHERE todo_tags.todo_id = @todo_id
  ORDER BY tags.name ASC
`);

function normalizeSubtask(row: Subtask): Subtask {
  return { ...row, completed: Boolean(row.completed) };
}

function hydrateTodo(todo: Todo): Todo {
  return {
    ...todo,
    completed: Boolean(todo.completed),
    is_recurring: Boolean(todo.is_recurring),
    subtasks: subtaskDB.findByTodoId(todo.id),
    tags: tagDB.findByTodoId(todo.id),
  };
}

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
    return (findAllByUserStmt.all({ user_id: userId }) as Todo[]).map(hydrateTodo);
  },

  findById(id: number): Todo | null {
    const row = findByIdStmt.get({ id }) as Todo | undefined;
    return row ? hydrateTodo(row) : null;
  },

  findByUserAndId(userId: number, id: number): Todo | null {
    const row = findByUserAndIdStmt.get({ user_id: userId, id }) as Todo | undefined;
    return row ? hydrateTodo(row) : null;
  },

  update(id: number, input: UpdateTodoInput): Todo {
    const updates: Record<string, unknown> = { id };
    const assignments: string[] = [];
    if (input.title !== undefined) { assignments.push('title = @title'); updates.title = input.title.trim(); }
    if (input.completed !== undefined) { assignments.push('completed = @completed'); updates.completed = input.completed ? 1 : 0; }
    if (input.due_date !== undefined) { assignments.push('due_date = @due_date'); updates.due_date = input.due_date ?? null; }
    if (input.priority !== undefined) { assignments.push('priority = @priority'); updates.priority = input.priority; }
    if (input.is_recurring !== undefined) { assignments.push('is_recurring = @is_recurring'); updates.is_recurring = input.is_recurring ? 1 : 0; }
    if (input.recurrence_pattern !== undefined) { assignments.push('recurrence_pattern = @recurrence_pattern'); updates.recurrence_pattern = input.recurrence_pattern ?? null; }
    if (input.reminder_minutes !== undefined) { assignments.push('reminder_minutes = @reminder_minutes'); updates.reminder_minutes = input.reminder_minutes ?? null; }
    if (input.last_notification_sent !== undefined) { assignments.push('last_notification_sent = @last_notification_sent'); updates.last_notification_sent = input.last_notification_sent ?? null; }
    if (assignments.length > 0) {
      assignments.push("updated_at = datetime('now')");
      db.prepare(`UPDATE todos SET ${assignments.join(', ')} WHERE id = @id`).run(updates);
    }
    return this.findById(id) as Todo;
  },

  completeRecurring(id: number, input: UpdateTodoInput, nextInput: CreateTodoInput, tagIds: number[] = []): { todo: Todo; nextInstance: Todo } {
    return db.transaction(() => {
      const todo = this.update(id, input);
      const nextInstance = this.create(nextInput);
      const attach = db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)');
      tagIds.forEach((tagId) => attach.run(nextInstance.id, tagId));
      return { todo, nextInstance: hydrateTodo(nextInstance) };
    })();
  },

  delete(id: number): void {
    deleteTodoStmt.run({ id });
  },

  findDueReminders(userId: number, now = new Date()): Todo[] {
    const timestamp = singaporeTimestamp(now);
    return this.findAllByUser(userId).filter((todo) => (
      !todo.completed &&
      todo.due_date !== null &&
      todo.reminder_minutes !== null &&
      todo.last_notification_sent === null &&
      singaporeTimestamp(todo.due_date) - todo.reminder_minutes * 60_000 <= timestamp
    ));
  },

  markNotificationSent(userId: number, id: number, timestamp: string): Todo | null {
    const todo = this.findByUserAndId(userId, id);
    if (!todo) return null;
    return this.update(id, { last_notification_sent: timestamp });
  },
};

export const subtaskDB = {
  findByTodoId(todoId: number): Subtask[] {
    return (findSubtasksByTodoStmt.all({ todo_id: todoId }) as Subtask[]).map(normalizeSubtask);
  },

  findById(id: number): Subtask | null {
    const row = findSubtaskStmt.get({ id }) as Subtask | undefined;
    return row ? normalizeSubtask(row) : null;
  },

  create(todoId: number, input: CreateSubtaskDto): Subtask {
    const result = createSubtaskStmt.run({ todo_id: todoId, title: input.title.trim() });
    return this.findById(Number(result.lastInsertRowid)) as Subtask;
  },

  update(id: number, input: UpdateSubtaskDto): Subtask {
    const assignments: string[] = [];
    const values: Record<string, unknown> = { id };
    if (input.title !== undefined) {
      assignments.push('title = @title');
      values.title = input.title.trim();
    }
    if (input.completed !== undefined) {
      assignments.push('completed = @completed');
      values.completed = input.completed ? 1 : 0;
    }
    if (assignments.length > 0) {
      db.prepare(`UPDATE subtasks SET ${assignments.join(', ')} WHERE id = @id`).run(values);
    }
    return this.findById(id) as Subtask;
  },

  delete(id: number): void {
    db.prepare('DELETE FROM subtasks WHERE id = @id').run({ id });
  },
};

export const tagDB = {
  findAllByUser(userId: number): Tag[] {
    return db.prepare('SELECT * FROM tags WHERE user_id = ? ORDER BY name ASC').all(userId) as Tag[];
  },

  findById(id: number, userId: number): Tag | null {
    return (db.prepare('SELECT * FROM tags WHERE id = ? AND user_id = ?').get(id, userId) as Tag | undefined) ?? null;
  },

  findByTodoId(todoId: number): Tag[] {
    return findTagsByTodoStmt.all({ todo_id: todoId }) as Tag[];
  },

  create(userId: number, input: { name: string; color?: string }): Tag {
    const result = db.prepare('INSERT INTO tags (user_id, name, color) VALUES (?, ?, ?)').run(userId, input.name.trim(), input.color ?? '#3B82F6');
    return this.findById(Number(result.lastInsertRowid), userId) as Tag;
  },

  update(id: number, userId: number, input: { name?: string; color?: string }): Tag {
    const assignments: string[] = [];
    const values: Record<string, unknown> = { id, user_id: userId };
    if (input.name !== undefined) { assignments.push('name = @name'); values.name = input.name.trim(); }
    if (input.color !== undefined) { assignments.push('color = @color'); values.color = input.color; }
    if (assignments.length > 0) db.prepare(`UPDATE tags SET ${assignments.join(', ')} WHERE id = @id AND user_id = @user_id`).run(values);
    return this.findById(id, userId) as Tag;
  },

  delete(id: number, userId: number): void {
    db.prepare('DELETE FROM tags WHERE id = ? AND user_id = ?').run(id, userId);
  },

  attachToTodo(todoId: number, tagId: number, userId: number): void {
    const tag = this.findById(tagId, userId);
    if (!tag || !todoDB.findByUserAndId(userId, todoId)) throw new Error('Tag or todo not found');
    db.prepare('INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)').run(todoId, tagId);
  },

  detachFromTodo(todoId: number, tagId: number, userId: number): void {
    if (!todoDB.findByUserAndId(userId, todoId) || !this.findById(tagId, userId)) return;
    db.prepare('DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?').run(todoId, tagId);
  },

  getTagIdsForTodo(todoId: number): number[] {
    return (db.prepare('SELECT tag_id FROM todo_tags WHERE todo_id = ?').all(todoId) as Array<{ tag_id: number }>).map((row) => row.tag_id);
  },
};

export const templateDB = {
  findAllByUser(userId: number): Template[] {
    return db.prepare('SELECT * FROM templates WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Template[];
  },

  findById(id: number, userId: number): Template | null {
    const row = db.prepare('SELECT * FROM templates WHERE id = ? AND user_id = ?').get(id, userId) as Template | undefined;
    return row ? { ...row, is_recurring: Boolean(row.is_recurring) } : null;
  },

  create(userId: number, input: Omit<Template, 'id' | 'user_id' | 'created_at'>): Template {
    const result = db.prepare(`
      INSERT INTO templates (user_id, name, title, priority, is_recurring, recurrence_pattern, reminder_minutes, due_offset_minutes, subtasks_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, input.name.trim(), input.title.trim(), input.priority, input.is_recurring ? 1 : 0, input.recurrence_pattern, input.reminder_minutes, input.due_offset_minutes, input.subtasks_json);
    return this.findById(Number(result.lastInsertRowid), userId) as Template;
  },

  update(id: number, userId: number, input: Omit<Template, 'id' | 'user_id' | 'created_at'>): Template {
    db.prepare(`UPDATE templates SET name = ?, title = ?, priority = ?, is_recurring = ?, recurrence_pattern = ?, reminder_minutes = ?, due_offset_minutes = ?, subtasks_json = ? WHERE id = ? AND user_id = ?`).run(
      input.name.trim(), input.title.trim(), input.priority, input.is_recurring ? 1 : 0, input.recurrence_pattern, input.reminder_minutes, input.due_offset_minutes, input.subtasks_json, id, userId,
    );
    return this.findById(id, userId) as Template;
  },

  delete(id: number, userId: number): void {
    db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(id, userId);
  },
};

export const holidayDB = {
  findByMonth(month: string): Holiday[] {
    return db.prepare("SELECT * FROM holidays WHERE date LIKE ? || '%' ORDER BY date ASC").all(month) as Holiday[];
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

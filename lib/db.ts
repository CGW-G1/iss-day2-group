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

const dbPath = path.join(process.cwd(), 'todos.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const runSchema = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

export { db };

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(), owner: text('owner').notNull(), document: text('document').notNull(),
  revision: integer('revision').notNull().default(1), updatedAt: text('updated_at').notNull(),
}, t => [index('projects_owner').on(t.owner)]);
export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(), owner: text('owner').notNull(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  kind: text('kind').notNull(), targetId: text('target_id').notNull(), snapshot: text('snapshot').notNull(),
  status: text('status').notNull().default('pending'), feedback: text('feedback'),
  createdAt: text('created_at').notNull(), completedAt: text('completed_at'),
}, t => [index('reviews_owner_project').on(t.owner,t.projectId)]);

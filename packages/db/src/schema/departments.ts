import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

export const departments = sqliteTable('departments', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  codeIdx: index('departments_code_idx').on(table.code),
}))

export const branches = sqliteTable('branches', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  departmentId: text('department_id').references(() => departments.id),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  codeIdx: index('branches_code_idx').on(table.code),
  departmentIdx: index('branches_department_idx').on(table.departmentId),
}))

export const vendors = sqliteTable('vendors', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  contactPerson: text('contact_person'),
  email: text('email'),
  phone: text('phone'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})

export const departmentsRelations = relations(departments, ({ many }) => ({
  branches: many(branches),
}))

export const branchesRelations = relations(branches, ({ one }) => ({
  department: one(departments, { fields: [branches.departmentId], references: [departments.id] }),
}))

export const vendorsRelations = relations(vendors, ({ many }) => ({
  // placeholder for future relations
}))

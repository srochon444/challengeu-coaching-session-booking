import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  role: text("role", { enum: ["coach", "student", "enrollment_admin"] }).notNull(),
  timezone: text("timezone").notNull(),
  createdAt: text("created_at").notNull(),
});

export const enrollments = sqliteTable("enrollments", {
  id: text("id").primaryKey(),
  studentUserId: text("student_user_id").notNull().unique().references(() => users.id),
  status: text("status", { enum: ["active", "suspended"] }).notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const availabilityBlocks = sqliteTable("availability_blocks", {
  id: text("id").primaryKey(),
  coachUserId: text("coach_user_id").notNull().references(() => users.id),
  startsAtUtc: text("starts_at_utc").notNull(),
  endsAtUtc: text("ends_at_utc").notNull(),
  durationMin: integer("duration_min").notNull(),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    availabilityBlockId: text("availability_block_id").notNull().references(() => availabilityBlocks.id),
    studentUserId: text("student_user_id").notNull().references(() => users.id),
    coachUserId: text("coach_user_id").notNull().references(() => users.id),
    startsAtUtc: text("starts_at_utc").notNull(),
    endsAtUtc: text("ends_at_utc").notNull(),
    status: text("status", { enum: ["confirmed", "cancelled"] }).notNull(),
    createdAt: text("created_at").notNull(),
    cancelledAt: text("cancelled_at"),
  },
  (t) => ({
    oneConfirmedPerBlock: uniqueIndex("one_confirmed_session_per_block")
      .on(t.availabilityBlockId)
      .where(sql`${t.status} = 'confirmed'`),
  }),
);

export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  recipientUserId: text("recipient_user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["session_booked", "session_cancelled"] }).notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
  readAt: text("read_at"),
});

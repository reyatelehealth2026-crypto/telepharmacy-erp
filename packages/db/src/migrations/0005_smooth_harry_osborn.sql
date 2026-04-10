CREATE TYPE "public"."chat_message_kind" AS ENUM('message', 'internal_note', 'system_event');--> statement-breakpoint
CREATE TABLE "line_quick_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_tag_assignments" (
	"patient_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"assigned_by_staff_id" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_tag_assignments_patient_id_tag_id_pk" PRIMARY KEY("patient_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "patient_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"label" varchar(120) NOT NULL,
	"color" varchar(32),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "message_kind" "chat_message_kind" DEFAULT 'message' NOT NULL;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "follow_up_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "reopened_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "patient_tag_assignments" ADD CONSTRAINT "patient_tag_assignments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_tag_assignments" ADD CONSTRAINT "patient_tag_assignments_tag_id_patient_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."patient_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_tag_assignments" ADD CONSTRAINT "patient_tag_assignments_assigned_by_staff_id_staff_id_fk" FOREIGN KEY ("assigned_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "line_quick_replies_active_sort_idx" ON "line_quick_replies" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "patient_tag_assignments_tag_idx" ON "patient_tag_assignments" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "patient_tags_sort_idx" ON "patient_tags" USING btree ("sort_order");--> statement-breakpoint
CREATE INDEX "chat_sessions_follow_up_at_idx" ON "chat_sessions" USING btree ("follow_up_at");--> statement-breakpoint
UPDATE "chat_messages" SET "message_kind" = 'system_event' WHERE "role" = 'system';--> statement-breakpoint
INSERT INTO "line_quick_replies" ("title", "body", "sort_order", "is_active") VALUES
  ('ทักทาย', 'สวัสดีค่ะ ยินดีช่วยเหลือค่ะ มีอะไรให้ช่วยไหมคะ', 0, true),
  ('รอตรวจสอบ', 'ขอบคุณค่ะ ทีมงานกำลังตรวจสอบให้ จะติดต่อกลับโดยเร็วที่สุดค่ะ', 1, true),
  ('สั่งยา', 'หากต้องการสั่งยา กรุณาส่งรูปใบสั่งยาหรือแจ้งชื่อยาที่ต้องการค่ะ', 2, true);
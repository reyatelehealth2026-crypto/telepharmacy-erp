CREATE TYPE "public"."chat_entry_intent" AS ENUM('consult', 'register', 'link_account', 'rx_upload', 'order_tracking', 'product_search', 'other');--> statement-breakpoint
CREATE TYPE "public"."chat_entry_point" AS ENUM('follow', 'message', 'postback', 'rich_menu', 'liff');--> statement-breakpoint
CREATE TYPE "public"."chat_priority" AS ENUM('normal', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."chat_queue_status" AS ENUM('self_service', 'needs_human', 'assigned', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."line_contact_state" AS ENUM('new_unregistered', 'stub_unfinished', 'link_pending', 'linked_returning');--> statement-breakpoint
CREATE TYPE "public"."webhook_event_status" AS ENUM('received', 'processing', 'processed', 'failed');--> statement-breakpoint
CREATE TABLE "line_contact_journeys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid,
	"line_user_id" varchar(50) NOT NULL,
	"state" "line_contact_state" DEFAULT 'new_unregistered' NOT NULL,
	"current_step" varchar(100),
	"source_event_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"last_event_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "line_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_event_key" varchar(255) NOT NULL,
	"dedupe_key" varchar(255) NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"line_user_id" varchar(50),
	"patient_id" uuid,
	"session_id" uuid,
	"status" "webhook_event_status" DEFAULT 'received' NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"processing_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error_message" text,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"replayed_from_event_id" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "line_webhook_events_provider_event_key_unique" UNIQUE("provider_event_key")
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD COLUMN "metadata" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "entry_point" "chat_entry_point";--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "entry_intent" "chat_entry_intent";--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "queue_status" "chat_queue_status" DEFAULT 'self_service';--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "priority" "chat_priority" DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "last_inbound_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "last_outbound_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD COLUMN "last_staff_read_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "line_contact_journeys" ADD CONSTRAINT "line_contact_journeys_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_webhook_events" ADD CONSTRAINT "line_webhook_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_webhook_events" ADD CONSTRAINT "line_webhook_events_session_id_chat_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "line_contact_journeys_line_user_id_uidx" ON "line_contact_journeys" USING btree ("line_user_id");--> statement-breakpoint
CREATE INDEX "line_contact_journeys_patient_id_idx" ON "line_contact_journeys" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "line_contact_journeys_state_idx" ON "line_contact_journeys" USING btree ("state");--> statement-breakpoint
CREATE INDEX "line_webhook_events_dedupe_idx" ON "line_webhook_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "line_webhook_events_event_type_idx" ON "line_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "line_webhook_events_status_idx" ON "line_webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "line_webhook_events_line_user_id_idx" ON "line_webhook_events" USING btree ("line_user_id");
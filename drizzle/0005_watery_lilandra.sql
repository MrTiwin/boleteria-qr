ALTER TABLE "ticket_download_log" DROP CONSTRAINT "ticket_download_log_ticket_id_ticket_id_fk";
--> statement-breakpoint
ALTER TABLE "ticket_download_log" ALTER COLUMN "ticket_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ticket_download_log" ADD CONSTRAINT "ticket_download_log_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE set null ON UPDATE no action;
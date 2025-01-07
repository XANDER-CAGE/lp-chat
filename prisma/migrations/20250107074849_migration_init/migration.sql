-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "chat";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "doctor";

-- CreateEnum
CREATE TYPE "chat"."chatstatus" AS ENUM ('active', 'done', 'underInvestigation', 'init');

-- CreateEnum
CREATE TYPE "chat"."shiftStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "chat"."file" (
    "id" VARCHAR(24) NOT NULL DEFAULT generate_object_id(),
    "bucket_name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" VARCHAR(24),
    "created_by" VARCHAR(24),
    "updated_by" VARCHAR(24),

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat"."message" (
    "id" VARCHAR(24) NOT NULL DEFAULT generate_object_id(),
    "content" TEXT,
    "file_id" TEXT,
    "chat_id" TEXT NOT NULL,
    "replied_message_id" TEXT,
    "tg_msg_id" TEXT,
    "author_id" TEXT NOT NULL,
    "firstname" TEXT,
    "lastname" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" VARCHAR(24),
    "created_by" VARCHAR(24),
    "updated_by" VARCHAR(24),

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat"."rejected_chat" (
    "id" VARCHAR(24) NOT NULL DEFAULT generate_object_id(),
    "chat_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" VARCHAR(24),
    "created_by" VARCHAR(24),
    "updated_by" VARCHAR(24),

    CONSTRAINT "rejected_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat"."rating" (
    "id" VARCHAR(24) NOT NULL DEFAULT generate_object_id(),
    "rate" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "chat_id" TEXT,
    "client_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" VARCHAR(24),
    "created_by" VARCHAR(24),
    "updated_by" VARCHAR(24),

    CONSTRAINT "rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat"."user" (
    "id" VARCHAR(24) NOT NULL DEFAULT generate_object_id(),
    "approved_at" TIMESTAMP(3),
    "blocked_at" TIMESTAMP(3),
    "shift_status" "chat"."shiftStatus",
    "telegram_id" TEXT,
    "username" TEXT,
    "kc_user_id" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "firstname" TEXT,
    "lastname" TEXT,
    "user_id" VARCHAR(24),
    "doctor_id" VARCHAR(24),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" VARCHAR(24),
    "created_by" VARCHAR(24),
    "updated_by" VARCHAR(24),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat"."chat" (
    "id" VARCHAR(24) NOT NULL DEFAULT generate_object_id(),
    "topic_id" TEXT NOT NULL,
    "status" "chat"."chatstatus" NOT NULL,
    "client_id" TEXT NOT NULL,
    "operator_id" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" VARCHAR(24),
    "created_by" VARCHAR(24),
    "updated_by" VARCHAR(24),

    CONSTRAINT "chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat"."topic" (
    "id" VARCHAR(24) NOT NULL DEFAULT generate_object_id(),
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" VARCHAR(24),
    "created_by" VARCHAR(24),
    "updated_by" VARCHAR(24),

    CONSTRAINT "topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat"."shift" (
    "id" VARCHAR(24) NOT NULL DEFAULT generate_object_id(),
    "status" "chat"."shiftStatus" NOT NULL,
    "operator_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" VARCHAR(24),
    "created_by" VARCHAR(24),
    "updated_by" VARCHAR(24),

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat"."message_to_delete" (
    "id" VARCHAR(24) NOT NULL DEFAULT generate_object_id(),
    "tg_message_id" TEXT NOT NULL,
    "operator_id" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" VARCHAR(24),
    "created_by" VARCHAR(24),
    "updated_by" VARCHAR(24),

    CONSTRAINT "message_to_delete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_file_id_key" ON "chat"."message"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_telegram_id_key" ON "chat"."user"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_kc_user_id_key" ON "chat"."user"("kc_user_id");

-- AddForeignKey
ALTER TABLE "chat"."message" ADD CONSTRAINT "message_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "chat"."file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat"."message" ADD CONSTRAINT "message_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"."chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat"."message" ADD CONSTRAINT "message_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "chat"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat"."message" ADD CONSTRAINT "message_replied_message_id_fkey" FOREIGN KEY ("replied_message_id") REFERENCES "chat"."message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat"."rejected_chat" ADD CONSTRAINT "rejected_chat_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"."chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat"."rejected_chat" ADD CONSTRAINT "rejected_chat_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "chat"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat"."rating" ADD CONSTRAINT "rating_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"."chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat"."rating" ADD CONSTRAINT "rating_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "chat"."user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat"."chat" ADD CONSTRAINT "chat_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "chat"."topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat"."chat" ADD CONSTRAINT "chat_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "chat"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat"."chat" ADD CONSTRAINT "chat_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "chat"."user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat"."shift" ADD CONSTRAINT "shift_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "chat"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat"."message_to_delete" ADD CONSTRAINT "message_to_delete_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "chat"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat"."message_to_delete" ADD CONSTRAINT "message_to_delete_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"."chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

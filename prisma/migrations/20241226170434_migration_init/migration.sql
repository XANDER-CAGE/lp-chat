-- CreateEnum
CREATE TYPE "chatstatus" AS ENUM ('active', 'done', 'underInvestigation', 'init');

-- CreateEnum
CREATE TYPE "shiftStatus" AS ENUM ('active', 'inactive');

-- CreateTable
CREATE TABLE "file" (
    "id" SERIAL NOT NULL,
    "bucket_name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" SERIAL NOT NULL,
    "content" TEXT,
    "file_id" INTEGER,
    "chat_id" INTEGER NOT NULL,
    "replied_message_id" INTEGER,
    "tg_msg_id" TEXT,
    "author_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rejected_chat" (
    "id" SERIAL NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rejected_chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rating" (
    "id" SERIAL NOT NULL,
    "rate" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "chat_id" INTEGER,
    "client_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "approved_at" TIMESTAMP(3),
    "blocked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "shift_status" "shiftStatus",
    "telegram_id" TEXT,
    "username" TEXT,
    "kc_user_id" TEXT,
    "email" TEXT,
    "lastname" TEXT,
    "firstname" TEXT,
    "phone" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat" (
    "id" SERIAL NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "status" "chatstatus" NOT NULL,
    "client_id" INTEGER NOT NULL,
    "operator_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "topic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift" (
    "id" SERIAL NOT NULL,
    "status" "shiftStatus" NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_to_delete" (
    "id" SERIAL NOT NULL,
    "tg_message_id" TEXT NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_to_delete_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_file_id_key" ON "message"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_telegram_id_key" ON "user"("telegram_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_kc_user_id_key" ON "user"("kc_user_id");

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "file"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_replied_message_id_fkey" FOREIGN KEY ("replied_message_id") REFERENCES "message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rejected_chat" ADD CONSTRAINT "rejected_chat_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rejected_chat" ADD CONSTRAINT "rejected_chat_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rating" ADD CONSTRAINT "rating_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rating" ADD CONSTRAINT "rating_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "chat_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "chat_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat" ADD CONSTRAINT "chat_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift" ADD CONSTRAINT "shift_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_to_delete" ADD CONSTRAINT "message_to_delete_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_to_delete" ADD CONSTRAINT "message_to_delete_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

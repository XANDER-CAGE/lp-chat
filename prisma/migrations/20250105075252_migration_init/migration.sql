/*
  Warnings:

  - The primary key for the `chat` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `file` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `message` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `message_to_delete` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `rating` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `rejected_chat` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `shift` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `topic` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `user` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "chat" DROP CONSTRAINT "chat_client_id_fkey";

-- DropForeignKey
ALTER TABLE "chat" DROP CONSTRAINT "chat_operator_id_fkey";

-- DropForeignKey
ALTER TABLE "chat" DROP CONSTRAINT "chat_topic_id_fkey";

-- DropForeignKey
ALTER TABLE "message" DROP CONSTRAINT "message_author_id_fkey";

-- DropForeignKey
ALTER TABLE "message" DROP CONSTRAINT "message_chat_id_fkey";

-- DropForeignKey
ALTER TABLE "message" DROP CONSTRAINT "message_file_id_fkey";

-- DropForeignKey
ALTER TABLE "message" DROP CONSTRAINT "message_replied_message_id_fkey";

-- DropForeignKey
ALTER TABLE "message_to_delete" DROP CONSTRAINT "message_to_delete_chat_id_fkey";

-- DropForeignKey
ALTER TABLE "message_to_delete" DROP CONSTRAINT "message_to_delete_operator_id_fkey";

-- DropForeignKey
ALTER TABLE "rating" DROP CONSTRAINT "rating_chat_id_fkey";

-- DropForeignKey
ALTER TABLE "rating" DROP CONSTRAINT "rating_client_id_fkey";

-- DropForeignKey
ALTER TABLE "rejected_chat" DROP CONSTRAINT "rejected_chat_chat_id_fkey";

-- DropForeignKey
ALTER TABLE "rejected_chat" DROP CONSTRAINT "rejected_chat_operator_id_fkey";

-- DropForeignKey
ALTER TABLE "shift" DROP CONSTRAINT "shift_operator_id_fkey";

-- AlterTable
ALTER TABLE "chat" DROP CONSTRAINT "chat_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(24),
ALTER COLUMN "topic_id" SET DATA TYPE TEXT,
ALTER COLUMN "client_id" SET DATA TYPE TEXT,
ALTER COLUMN "operator_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "chat_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "chat_id_seq";

-- AlterTable
ALTER TABLE "file" DROP CONSTRAINT "file_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(24),
ADD CONSTRAINT "file_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "file_id_seq";

-- AlterTable
ALTER TABLE "message" DROP CONSTRAINT "message_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(24),
ALTER COLUMN "file_id" SET DATA TYPE TEXT,
ALTER COLUMN "chat_id" SET DATA TYPE TEXT,
ALTER COLUMN "replied_message_id" SET DATA TYPE TEXT,
ALTER COLUMN "author_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "message_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "message_id_seq";

-- AlterTable
ALTER TABLE "message_to_delete" DROP CONSTRAINT "message_to_delete_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(24),
ALTER COLUMN "operator_id" SET DATA TYPE TEXT,
ALTER COLUMN "chat_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "message_to_delete_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "message_to_delete_id_seq";

-- AlterTable
ALTER TABLE "rating" DROP CONSTRAINT "rating_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(24),
ALTER COLUMN "chat_id" SET DATA TYPE TEXT,
ALTER COLUMN "client_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "rating_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "rating_id_seq";

-- AlterTable
ALTER TABLE "rejected_chat" DROP CONSTRAINT "rejected_chat_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(24),
ALTER COLUMN "chat_id" SET DATA TYPE TEXT,
ALTER COLUMN "operator_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "rejected_chat_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "rejected_chat_id_seq";

-- AlterTable
ALTER TABLE "shift" DROP CONSTRAINT "shift_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(24),
ALTER COLUMN "operator_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "shift_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "shift_id_seq";

-- AlterTable
ALTER TABLE "topic" DROP CONSTRAINT "topic_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(24),
ADD CONSTRAINT "topic_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "topic_id_seq";

-- AlterTable
ALTER TABLE "user" DROP CONSTRAINT "user_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE VARCHAR(24),
ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "user_id_seq";

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

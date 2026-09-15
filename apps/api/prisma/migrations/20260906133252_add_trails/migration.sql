-- CreateTable
CREATE TABLE "trails" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cover_image_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "trails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trail_courses" (
    "id" TEXT NOT NULL,
    "trail_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trail_courses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trails_slug_key" ON "trails"("slug");

-- CreateIndex
CREATE INDEX "trails_active_idx" ON "trails"("active");

-- CreateIndex
CREATE INDEX "trails_deleted_at_idx" ON "trails"("deleted_at");

-- CreateIndex
CREATE INDEX "trail_courses_trail_id_idx" ON "trail_courses"("trail_id");

-- CreateIndex
CREATE INDEX "trail_courses_course_id_idx" ON "trail_courses"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "trail_courses_trail_id_course_id_key" ON "trail_courses"("trail_id", "course_id");

-- AddForeignKey
ALTER TABLE "trails" ADD CONSTRAINT "trails_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_courses" ADD CONSTRAINT "trail_courses_trail_id_fkey" FOREIGN KEY ("trail_id") REFERENCES "trails"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trail_courses" ADD CONSTRAINT "trail_courses_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

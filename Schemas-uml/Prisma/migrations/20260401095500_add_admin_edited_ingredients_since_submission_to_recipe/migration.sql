ALTER TABLE "recipes"
ADD COLUMN "admin_edited_ingredients_since_submission" BOOLEAN NOT NULL DEFAULT false;

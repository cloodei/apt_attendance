CREATE TABLE "STUDENTS"(
    "id" bigserial PRIMARY KEY NOT NULL,
    "name" VARCHAR(255) NOT NULL
);

CREATE TABLE "STUDENT_LIST" (
    student_id BIGINT NOT NULL,
    class_id   BIGINT NOT NULL,
    PRIMARY KEY (student_id, class_id)
);

CREATE TABLE "CLASSES"(
    "id" bigserial PRIMARY KEY NOT NULL,
    "user_id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active'
);

CREATE TABLE "USERS"(
    "id" bigserial PRIMARY KEY NOT NULL,
    "account_id" VARCHAR(64) UNIQUE NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "faculty" VARCHAR(64) NOT NULL,
    "academic_rank" VARCHAR(32) NOT NULL
);

CREATE TABLE "SESSIONS"(
    "id" bigserial PRIMARY KEY NOT NULL,
    "class_id" BIGINT NOT NULL,
    "start_time" TIMESTAMP WITH TIME zone NOT NULL,
    "end_time" TIMESTAMP WITH TIME zone NOT NULL
);

CREATE TABLE "ATTENDANCES"(
    "id" bigserial PRIMARY KEY NOT NULL,
    "session_id" BIGINT NOT NULL,
    "student_id" BIGINT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    "in_time" TIMESTAMP WITH TIME zone DEFAULT NULL,
    "out_time" TIMESTAMP WITH TIME zone DEFAULT NULL
);
CREATE TABLE "STUDENT_IDENTITIES"(
    "id" bigserial PRIMARY KEY NOT NULL,
    "student_id" BIGINT NOT NULL,
    "vector" VECTOR(512) NOT NULL
);

ALTER TABLE
    "SESSIONS" ADD CONSTRAINT "sessions_class_id_foreign" FOREIGN KEY("class_id") REFERENCES "CLASSES"("id") ON DELETE CASCADE;
ALTER TABLE
    "STUDENT_LIST" ADD CONSTRAINT "student_list_class_id_foreign" FOREIGN KEY("class_id") REFERENCES "CLASSES"("id") ON DELETE CASCADE;
ALTER TABLE
    "ATTENDANCES" ADD CONSTRAINT "attendances_session_id_foreign" FOREIGN KEY("session_id") REFERENCES "SESSIONS"("id") ON DELETE CASCADE;
ALTER TABLE
    "STUDENT_IDENTITIES" ADD CONSTRAINT "vectors_student_id_foreign" FOREIGN KEY("student_id") REFERENCES "STUDENTS"("id") ON DELETE CASCADE;
ALTER TABLE
    "STUDENT_LIST" ADD CONSTRAINT "student_list_student_id_foreign" FOREIGN KEY("student_id") REFERENCES "STUDENTS"("id") ON DELETE CASCADE;
ALTER TABLE
    "CLASSES" ADD CONSTRAINT "classes_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "USERS"("id") ON DELETE CASCADE;

CREATE TABLE "STUDENTS"(
    "id" bigserial NOT NULL,
    "name" VARCHAR(255) NOT NULL
);
ALTER TABLE
    "STUDENTS" ADD PRIMARY KEY("id");
CREATE TABLE "STUDENT_LIST"(
    "student_id" bigserial NOT NULL,
    "class_id" bigserial NOT NULL
);
ALTER TABLE
    "STUDENT_LIST" ADD PRIMARY KEY("student_id");
ALTER TABLE
    "STUDENT_LIST" ADD PRIMARY KEY("class_id");
CREATE TABLE "CLASSES"(
    "id" bigserial NOT NULL,
    "user_id" bigserial NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(255) NOT NULL,
    "status" VARCHAR(255) NOT NULL
);
ALTER TABLE
    "CLASSES" ADD PRIMARY KEY("id");
CREATE TABLE "USERS"(
    "id" bigserial NOT NULL,
    "account_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "faculty" VARCHAR(255) NOT NULL,
    "academic_rank" VARCHAR(255) NOT NULL
);
ALTER TABLE
    "USERS" ADD PRIMARY KEY("id");
CREATE TABLE "SESSIONS"(
    "id" bigserial NOT NULL,
    "class_id" bigserial NOT NULL,
    "start_time" TIMESTAMP(0) WITH
        TIME zone NOT NULL,
        "end_time" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL
);
ALTER TABLE
    "SESSIONS" ADD PRIMARY KEY("id");
CREATE TABLE "ATTENDANCES"(
    "session_id" bigserial NOT NULL,
    "student_id" bigserial NOT NULL,
    "in_time" TIMESTAMP(0) WITH
        TIME zone NOT NULL,
        "out_time" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL
);
CREATE TABLE "VECTORS"(
    "id" bigserial NOT NULL,
    "student_id" bigserial NOT NULL,
    "vector" BOOLEAN NOT NULL
);
ALTER TABLE
    "VECTORS" ADD PRIMARY KEY("id");
ALTER TABLE
    "SESSIONS" ADD CONSTRAINT "sessions_class_id_foreign" FOREIGN KEY("class_id") REFERENCES "CLASSES"("id");
ALTER TABLE
    "STUDENT_LIST" ADD CONSTRAINT "student_list_class_id_foreign" FOREIGN KEY("class_id") REFERENCES "CLASSES"("id");
ALTER TABLE
    "ATTENDANCES" ADD CONSTRAINT "attendances_session_id_foreign" FOREIGN KEY("session_id") REFERENCES "SESSIONS"("id");
ALTER TABLE
    "VECTORS" ADD CONSTRAINT "vectors_student_id_foreign" FOREIGN KEY("student_id") REFERENCES "STUDENTS"("id");
ALTER TABLE
    "STUDENT_LIST" ADD CONSTRAINT "student_list_student_id_foreign" FOREIGN KEY("student_id") REFERENCES "STUDENTS"("id");
ALTER TABLE
    "CLASSES" ADD CONSTRAINT "classes_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "USERS"("id");
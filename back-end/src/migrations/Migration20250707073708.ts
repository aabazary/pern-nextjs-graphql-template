import { Migration } from '@mikro-orm/migrations';

export class Migration20250707073708 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table "PasswordResetToken" drop constraint "PasswordResetToken_userId_fkey";`);

    this.addSql(`alter table "RefreshToken" drop constraint "RefreshToken_userId_fkey";`);

    this.addSql(`create table "user" ("id" varchar(255) not null, "email" varchar(255) not null, "password" varchar(255) not null, "role" text check ("role" in ('UNREGISTERED', 'REGISTERED', 'OWNER', 'SUPERADMIN')) not null default 'REGISTERED', "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "user_pkey" primary key ("id"));`);
    this.addSql(`alter table "user" add constraint "user_email_unique" unique ("email");`);

    this.addSql(`create table "refresh_token" ("id" varchar(255) not null, "token_hash" varchar(255) not null, "user_id" varchar(255) not null, "expires_at" timestamptz not null, "user_agent" varchar(255) null, "ip_address" varchar(255) null, "created_at" timestamptz not null, "updated_at" timestamptz not null, constraint "refresh_token_pkey" primary key ("id"));`);
    this.addSql(`alter table "refresh_token" add constraint "refresh_token_token_hash_unique" unique ("token_hash");`);

    this.addSql(`create table "password_reset_token" ("id" varchar(255) not null, "token_hash" varchar(255) not null, "user_id" varchar(255) not null, "expires_at" timestamptz not null, "used" boolean not null default false, "created_at" timestamptz not null, constraint "password_reset_token_pkey" primary key ("id"));`);
    this.addSql(`alter table "password_reset_token" add constraint "password_reset_token_token_hash_unique" unique ("token_hash");`);

    this.addSql(`alter table "refresh_token" add constraint "refresh_token_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);

    this.addSql(`alter table "password_reset_token" add constraint "password_reset_token_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;`);

    this.addSql(`drop table if exists "PasswordResetToken" cascade;`);

    this.addSql(`drop table if exists "RefreshToken" cascade;`);

    this.addSql(`drop table if exists "User" cascade;`);

    this.addSql(`drop table if exists "_prisma_migrations" cascade;`);

    this.addSql(`drop type "Role";`);
  }

  override async down(): Promise<void> {
    this.addSql(`create type "Role" as enum ('UNREGISTERED', 'REGISTERED', 'OWNER', 'SUPERADMIN');`);
    this.addSql(`alter table "refresh_token" drop constraint "refresh_token_user_id_foreign";`);

    this.addSql(`alter table "password_reset_token" drop constraint "password_reset_token_user_id_foreign";`);

    this.addSql(`create table "PasswordResetToken" ("id" text not null, "tokenHash" text not null, "userId" text not null, "expiresAt" timestamp(3) not null, "used" bool not null default false, "createdAt" timestamp(3) not null default CURRENT_TIMESTAMP, constraint "PasswordResetToken_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON public."PasswordResetToken" USING btree ("tokenHash");`);
    this.addSql(`CREATE INDEX "PasswordResetToken_userId_idx" ON public."PasswordResetToken" USING btree ("userId");`);

    this.addSql(`create table "RefreshToken" ("id" text not null, "tokenHash" text not null, "userId" text not null, "expiresAt" timestamp(3) not null, "userAgent" text null, "ipAddress" text null, "createdAt" timestamp(3) not null default CURRENT_TIMESTAMP, "updatedAt" timestamp(3) not null, constraint "RefreshToken_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON public."RefreshToken" USING btree ("tokenHash");`);

    this.addSql(`create table "User" ("id" text not null, "email" text not null, "password" text not null, "role" "Role" not null default 'REGISTERED', "createdAt" timestamp(3) not null default CURRENT_TIMESTAMP, "updatedAt" timestamp(3) not null, constraint "User_pkey" primary key ("id"));`);
    this.addSql(`alter table "User" add constraint "User_email_key" unique ("email");`);

    this.addSql(`create table "_prisma_migrations" ("id" varchar(36) not null, "checksum" varchar(64) not null, "finished_at" timestamptz(6) null, "migration_name" varchar(255) not null, "logs" text null, "rolled_back_at" timestamptz(6) null, "started_at" timestamptz(6) not null default now(), "applied_steps_count" int4 not null default 0, constraint "_prisma_migrations_pkey" primary key ("id"));`);

    this.addSql(`alter table "PasswordResetToken" add constraint "PasswordResetToken_userId_fkey" foreign key ("userId") references "User" ("id") on update cascade on delete cascade;`);

    this.addSql(`alter table "RefreshToken" add constraint "RefreshToken_userId_fkey" foreign key ("userId") references "User" ("id") on update cascade on delete cascade;`);

    this.addSql(`drop table if exists "user" cascade;`);

    this.addSql(`drop table if exists "refresh_token" cascade;`);

    this.addSql(`drop table if exists "password_reset_token" cascade;`);
  }

}

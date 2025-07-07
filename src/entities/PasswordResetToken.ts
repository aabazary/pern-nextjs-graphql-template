import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';

@Entity()
export class PasswordResetToken {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ unique: true })
  tokenHash!: string;

  @ManyToOne(() => 'User')
  user!: any;

  @Property()
  expiresAt!: Date;

  @Property({ default: false })
  used: boolean = false;

  @Property()
  createdAt: Date = new Date();
} 
import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';

@Entity()
export class RefreshToken {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ unique: true })
  tokenHash!: string;

  @ManyToOne(() => 'User')
  user!: any;

  @Property()
  expiresAt!: Date;

  @Property({ nullable: true })
  userAgent?: string;

  @Property({ nullable: true })
  ipAddress?: string;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
} 
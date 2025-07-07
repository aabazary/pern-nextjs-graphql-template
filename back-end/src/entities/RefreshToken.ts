import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { User } from './User';

@Entity()
export class RefreshToken {
  @PrimaryKey()
  id: string = uuidv4();

  @Property({ unique: true })
  tokenHash!: string;

  @ManyToOne(() => User)
  user!: User;

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

  constructor() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}

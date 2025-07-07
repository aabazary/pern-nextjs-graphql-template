import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { User } from './User';

@Entity()
export class PasswordResetToken {
  @PrimaryKey()
  id: string = uuidv4();

  @Property({ unique: true })
  tokenHash!: string;

  @ManyToOne(() => User)
  user!: User;

  @Property()
  expiresAt!: Date;

  @Property({ default: false })
  used: boolean = false;

  @Property()
  createdAt: Date = new Date();

  constructor() {
    this.used = false;
    this.createdAt = new Date();
  }
}

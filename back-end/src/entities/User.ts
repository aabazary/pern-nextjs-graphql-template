import { Entity, PrimaryKey, Property, Enum, OneToMany } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';
import { Role } from './Role';
import { RefreshToken } from './RefreshToken';
import { PasswordResetToken } from './PasswordResetToken';

@Entity()
export class User {
  @PrimaryKey()
  id: string = uuidv4();

  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;

  @Enum(() => Role)
  role: Role = Role.REGISTERED;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user)
  refreshTokens = [] as RefreshToken[];

  @OneToMany(() => PasswordResetToken, token => token.user)
  passwordResetTokens = [] as PasswordResetToken[];

  constructor() {
    this.refreshTokens = [];
    this.passwordResetTokens = [];
  }
}

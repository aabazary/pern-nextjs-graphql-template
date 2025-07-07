import { Entity, PrimaryKey, Property, Enum, OneToMany } from '@mikro-orm/core';
import { Role } from './Role';

@Entity()
export class User {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

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

  @OneToMany(() => 'RefreshToken', refreshToken => refreshToken.user)
  refreshTokens = [] as any[];

  @OneToMany(() => 'PasswordResetToken', token => token.user)
  passwordResetTokens = [] as any[];
} 
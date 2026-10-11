/** Port for password hashing (adapter: Argon2PasswordHasher). */
export abstract class PasswordHasher {
  public abstract hash(password: string): Promise<string>;

  public abstract verify(hash: string, password: string): Promise<boolean>;
}

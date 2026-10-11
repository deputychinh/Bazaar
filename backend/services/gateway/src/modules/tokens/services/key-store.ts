import { readFile } from 'node:fs/promises';

import { Injectable, type OnModuleInit } from '@nestjs/common';
import { type CryptoKey, exportJWK, importPKCS8, importSPKI, type JWK } from 'jose';

import { AppConfig } from '../../../config/app-config.js';
import { JWT_ALGORITHM, JWT_KEY_ID } from '../../../constants/auth.constant.js';

/** Loads the RS256 key pair once at start-up (files from `make keys` or a mounted secret). */
@Injectable()
export class KeyStore implements OnModuleInit {
  private privateKey: CryptoKey | undefined;
  private publicKey: CryptoKey | undefined;
  private publicJwk: JWK | undefined;

  public constructor(private readonly config: AppConfig) {}

  public async onModuleInit(): Promise<void> {
    const [privatePem, publicPem] = await Promise.all([
      readFile(this.config.env.JWT_PRIVATE_KEY_FILE, 'utf8'),
      readFile(this.config.env.JWT_PUBLIC_KEY_FILE, 'utf8'),
    ]);
    await this.use(privatePem, publicPem);
  }

  /** Also used by tests to load generated keys. */
  public async use(privatePem: string, publicPem: string): Promise<void> {
    this.privateKey = await importPKCS8(privatePem, JWT_ALGORITHM);
    this.publicKey = await importSPKI(publicPem, JWT_ALGORITHM, { extractable: true });
    this.publicJwk = {
      ...(await exportJWK(this.publicKey)),
      kid: JWT_KEY_ID,
      alg: JWT_ALGORITHM,
      use: 'sig',
    };
  }

  public signingKey(): CryptoKey {
    return KeyStore.loaded(this.privateKey);
  }

  public verificationKey(): CryptoKey {
    return KeyStore.loaded(this.publicKey);
  }

  public jwks(): { keys: JWK[] } {
    return { keys: [KeyStore.loaded(this.publicJwk)] };
  }

  private static loaded<T>(value: T | undefined): T {
    if (value === undefined) {
      throw new Error('JWT keys are not loaded');
    }
    return value;
  }
}

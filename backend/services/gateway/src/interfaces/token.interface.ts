export interface IssuedAccessToken {
  accessToken: string;
  expiresIn: number;
}

export interface StoredRefreshToken {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface StoredUserToken {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

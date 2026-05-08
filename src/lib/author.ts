/**
 * Stable auth identity + human-readable label for review/rating JSON.
 * Display name: non-empty trimmed `username`, else trimmed `firstName` + `lastName`, else "Unknown user"
 * (e.g. when userinfo enrichment did not populate profile fields).
 */
export const userAuthorSelect = {
  subjectId: true,
  username: true,
  firstName: true,
  lastName: true,
} as const;

export type UserAuthorPayload = {
  subjectId: string;
  username: string;
  firstName: string;
  lastName: string;
};

export type AuthorDto = {
  id: string;
  displayName: string;
};

export function toAuthor(user: UserAuthorPayload): AuthorDto {
  const username = user.username.trim();
  if (username.length > 0) {
    return { id: user.subjectId, displayName: username };
  }
  const fn = user.firstName.trim();
  const ln = user.lastName.trim();
  const combined = [fn, ln]
    .filter((p) => p.length > 0)
    .join(' ')
    .trim();
  if (combined.length > 0) {
    return { id: user.subjectId, displayName: combined };
  }
  return { id: user.subjectId, displayName: 'Unknown user' };
}

# Cursor Task: Use Database Role for Admin-Gated Routes

## Problem

The backend currently verifies authentication using the JWT from Auth², then checks authorization using the `role` value from the decoded token.

That causes a problem because the JWT may say the user role is `User`, even when the local database has that same user marked as `Admin`.

Example:

- JWT role: `User`
- Local database role: `Admin`
- Current middleware checks JWT role
- Result: admin route returns `403 Insufficient permissions`

We need to keep using the JWT for authentication, but use the local database role for app authorization.

---

## Goal

Add a new middleware that:

1. Requires the user to be authenticated.
2. Reads `request.user.sub` from the verified JWT.
3. Looks up the local user in Prisma using `subjectId`.
4. Checks the local database `role` instead of the JWT role.
5. Allows access if the database role is at least the required role.
6. Optionally syncs `request.user.role` to the database role for controller use.

---

## Existing Context

The app already has:

- `requireAuth`, which verifies the JWT and attaches `request.user`.
- `ROLE_HIERARCHY`:

```ts
export const ROLE_HIERARCHY = ['User', 'Moderator', 'Admin', 'SuperAdmin', 'Owner'] as const;
export type Role = (typeof ROLE_HIERARCHY)[number];
```

- `resolveLocalUser`, which finds or creates a local user using `subjectId: sub`.
- Prisma user rows that include a local app role such as `User` or `Admin`.

Important: `resolveLocalUser` should not reset an existing user's role back to `User`.

---

## Change Needed

In the auth middleware file, import Prisma:

```ts
import { prisma } from '../lib/prisma';
```

Then add this middleware:

```ts
export const requireDbRoleAtLeast = (minRole: Role): RequestHandler => {
  const minIdx = ROLE_HIERARCHY.indexOf(minRole);

  return async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    try {
      if (!request.user?.sub) {
        response.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const localUser = await prisma.user.findUnique({
        where: {
          subjectId: request.user.sub,
        },
      });

      if (!localUser) {
        response.status(403).json({ error: 'User does not exist locally' });
        return;
      }

      const userIdx = ROLE_HIERARCHY.indexOf(localUser.role as Role);

      if (userIdx < 0 || userIdx < minIdx) {
        response.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Optional: update the request user role to match the database role.
      request.user.role = localUser.role as Role;

      next();
    } catch {
      response.status(500).json({ error: 'Failed to verify user permissions' });
    }
  };
};
```

---

## Replace Admin Route Guards

For admin-gated routes, replace this:

```ts
requireRoleAtLeast('Admin');
```

with this:

```ts
requireDbRoleAtLeast('Admin');
```

Example:

```ts
router.patch(
  '/issues/:issueID',
  requireAuth,
  requireDbRoleAtLeast('Admin'),
  validateIssueIdParam,
  validatePatchIssueBody,
  updateIssue
);
```

Example delete route:

```ts
router.delete(
  '/issues/:issueID',
  requireAuth,
  requireDbRoleAtLeast('Admin'),
  validateIssueIdParam,
  deleteIssue
);
```

Do not use `requireRoleAtLeast('Admin')` for app admin routes anymore because it checks the JWT role.

---

## Keep Existing JWT Middleware

Do not remove `requireAuth`.

The intended flow should be:

```txt
JWT verifies identity → request.user.sub is trusted → database finds local user → database role controls authorization
```

The JWT proves who the user is. The database decides what app permissions they have.

---

## Verify `resolveLocalUser` Does Not Reset Roles

Make sure the existing local user upsert does not overwrite the role during normal login/request flow.

Good:

```ts
return prisma.user.upsert({
  where: { subjectId: sub },
  update: {},
  create: { subjectId: sub, username, email, firstName, lastName },
});
```

Bad:

```ts
return prisma.user.upsert({
  where: { subjectId: sub },
  update: { role: 'User' },
  create: { subjectId: sub, username, email, firstName, lastName, role: 'User' },
});
```

The bad version would reset an existing Admin back to User.

---

## Prisma Role Default

If the Prisma schema has a `role` field, it should have a default user role.

Example:

```prisma
role String @default("User")
```

That way new users become normal users by default, but manually promoted users stay admins.

---

## Expected Result

After this change:

- A logged-in user with JWT role `User` can still access admin routes if their database row has `role = 'Admin'`.
- Admin status is controlled by the app database.
- Auth² remains responsible for token verification only.
- The backend no longer depends on Auth²'s token role for local admin permissions.

---

## Testing Checklist

1. Make sure Christian's local database row has `role = 'Admin'`.
2. Log in normally through the frontend.
3. Call an admin-gated route.
4. Confirm the route succeeds instead of returning `403`.
5. Test a normal user with `role = 'User'` and confirm the route still returns `403`.

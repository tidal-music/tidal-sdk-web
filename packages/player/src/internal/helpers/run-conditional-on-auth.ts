import { isAuthorizedWithUser } from '../index';

/**
 * Accepts two functions: one to run if the user is authorized,
 * and one to run if the user is not authorized.
 */
export async function runConditionalOnAuth<T>({
  auth,
  open,
}: {
  auth: () => Promise<T>;
  open: () => Promise<T>;
}) {
  const authorizedWithUser = await isAuthorizedWithUser();

  if (authorizedWithUser) {
    return auth();
  } else {
    return open();
  }
}

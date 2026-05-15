import { isAuthorizedWithUser } from '../index.js';

/**
 * Run the provided function if we're authorized with a user.
 */
export async function runIfAuthorizedWithUser<T>(fn: () => Promise<T>) {
  const authorizedWithUser = await isAuthorizedWithUser();

  if (authorizedWithUser) {
    return fn();
  }
}

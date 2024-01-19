import { isAuthorizedWithUser } from '../index';

/**
 * Run the provided function if we're authorized with a user.
 */
export async function runIfAuthorizedWithUser(fn: Function) {
  const authorizedWithUser = await isAuthorizedWithUser();

  if (authorizedWithUser) {
    return fn();
  }
}

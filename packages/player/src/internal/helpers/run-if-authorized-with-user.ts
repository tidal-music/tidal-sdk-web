import { isAuthorizedWithUser } from '../index';

/**
 * Run the provided function if we're authorized with a user.
 */
export async function runIfAuthorizedWithUser(fn: Function): Promise<any> {
  const authorizedWithUser = await isAuthorizedWithUser();

  if (authorizedWithUser) {
    return fn();
  }
}

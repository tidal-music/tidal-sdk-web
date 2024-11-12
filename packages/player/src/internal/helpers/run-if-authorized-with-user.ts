import { isAuthorizedWithUser } from '../index';

/**
 * Run the provided function if we're authorized with a user.
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export async function runIfAuthorizedWithUser(fn: Function) {
  const authorizedWithUser = await isAuthorizedWithUser();

  if (authorizedWithUser) {
    return fn();
  }
}

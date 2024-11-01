export { createAPIClient } from './api';

import type { components as catalogueComponents } from './catalogueAPI.generated';
import type { components as playlistComponents } from './playlistAPI.generated';
import type { components as searchComponents } from './searchAPI.generated';
import type { components as userComponents } from './userAPI.generated';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type components = catalogueComponents &
  playlistComponents &
  searchComponents &
  userComponents;

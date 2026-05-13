import type { MediaProduct } from '../../api/interfaces.js';
import type { AssetPresentation } from '../types.js';

/**
 * Returns a boolean indicating whether the user is in a post-paywall state.
 */
export function getIsPostPaywall(
  assetPresentation: AssetPresentation,
  mediaProduct: MediaProduct,
) {
  return (
    assetPresentation === 'FULL' &&
    mediaProduct.sourceType !== 'PRIVATE_LINK_SHARING'
  );
}

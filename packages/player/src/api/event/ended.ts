import type { MediaProduct } from '../interfaces';

export type EndReason = 'completed' | 'error' | 'skip';
export type EndedEvent = CustomEvent<{
  mediaProduct: MediaProduct;
  reason: EndReason;
}>;

export function ended(
  reason: EndReason,
  mediaProduct: MediaProduct,
): EndedEvent {
  return new CustomEvent('ended', {
    detail: {
      mediaProduct,
      reason,
    },
  });
}

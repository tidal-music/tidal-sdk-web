import { expect } from 'chai';

import { generateGUID } from './generate-guid';

const regex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('generateGUID', () => {
  it('generates a valid unique id using Web Crypto API', () => {
    const id = generateGUID(true);
    const result = regex.exec(id);

    if (!result) {
      throw new Error('Regex failed, cannot fulfill test.');
    }

    expect(result[0]).to.equal(id);
  });

  it('generates a valid unique id using Math.random', () => {
    const id = generateGUID(false);
    const result = regex.exec(id);

    if (!result) {
      throw new Error('Regex failed, cannot fulfill test.');
    }

    expect(result[0]).to.equal(id);
  });
});

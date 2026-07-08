import * as mock from '../mock/seed.js';

// Support desk (Tidio / Gorgias). Both expose APIs on paid tiers; until a key
// is wired in, the queue reflects the simulated store.
export const supportDesk = {
  mode: 'mock',
  async getQueue() {
    return mock.supportQueue();
  },
};

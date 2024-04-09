import { applyMiddleware, Store } from '@eduardoac-skimlinks/webext-redux';
import thunkMiddleware from 'redux-thunk';

const middlewares = [thunkMiddleware];

export const proxyStore = applyMiddleware(new Store(), ...middlewares);

// @see https://github.com/tshaddix/webext-redux/issues/286
Object.assign(proxyStore, {
  dispatch: proxyStore.dispatch.bind(proxyStore),
  getState: proxyStore.getState.bind(proxyStore),
  subscribe: proxyStore.subscribe.bind(proxyStore),
});

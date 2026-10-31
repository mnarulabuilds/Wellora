import { AxiosError, AxiosHeaders } from 'axios';

import { isNetworkError, parseApiError, q } from '../api/client';

function axiosError(status?: number, data?: unknown, code?: string) {
  const config = { headers: new AxiosHeaders() };
  const response = status ? ({ status, data, statusText: '', headers: {}, config } as any) : undefined;
  return new AxiosError('boom', code, config as any, undefined, response);
}

describe('api client helpers', () => {
  it('prefers the server message', () => {
    expect(parseApiError(axiosError(404, { status: 'error', message: 'Profile not found' }))).toBe('Profile not found');
  });

  it('joins validation detail arrays', () => {
    expect(parseApiError(axiosError(422, { detail: ['age: too small', { msg: 'name: required' }] }))).toBe(
      'age: too small, name: required'
    );
  });

  it('explains network failures', () => {
    const err = axiosError(undefined, undefined, 'ERR_NETWORK');
    expect(isNetworkError(err)).toBe(true);
    expect(parseApiError(err)).toMatch(/Can't reach Wellora/);
  });

  it('does not treat HTTP errors as network errors', () => {
    expect(isNetworkError(axiosError(422, {}))).toBe(false);
    expect(isNetworkError(new Error('x'))).toBe(false);
  });

  it('handles plain errors and unknowns', () => {
    expect(parseApiError(new Error('oops'))).toBe('oops');
    expect(parseApiError('???')).toMatch(/Something went wrong/);
  });

  it('builds query strings and skips empty values', () => {
    expect(q({ user_id: 'a b', limit: 5, date: undefined, type: '' })).toBe('user_id=a+b&limit=5');
  });
});

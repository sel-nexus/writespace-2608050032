/** Exercise identity business rules and persisted state, including all storage failure stages. */
import { describe, it, expect, vi } from 'vitest';
import { login, register, getSession, setSession, clearSession, ADMIN_ID, getRoleHome } from '../src/utils/auth';
import { getUsers, saveUsers } from '../src/utils/storage';
const fields = { displayName: 'Ada Lovelace', username: 'ada', password: 'demo', confirmPassword: 'demo' };

describe('login and session', () => {
  it('signs default admin in before stored accounts and persists the special identity', () => {
    const session = login('admin', 'admin');
    expect(session).toEqual({ userId: ADMIN_ID, username: 'admin', displayName: 'Admin', role: 'admin' });
    expect(getSession()).toEqual(session);
    expect(getRoleHome(session)).toBe('/admin');
  });
  it('registers, logs out, and signs a writer in with persisted data', () => {
    const session = register(fields);
    clearSession();
    expect(getSession()).toBeNull();
    expect(localStorage.getItem('writespace_session')).toBeNull();
    expect(login('ada', 'demo')).toEqual(session);
    expect(getRoleHome(session)).toBe('/blogs');
    expect(getUsers()[0]).toMatchObject({ displayName: fields.displayName, username: fields.username, password: fields.password, role: 'user' });
    expect(getUsers()[0]).not.toHaveProperty('confirmPassword');
  });
  it('supports a stored admin account', () => {
    register(fields);
    const users = getUsers();
    saveUsers([{ ...users[0], role: 'admin' }]);
    expect(login('ada', 'demo').role).toBe('admin');
  });
  it.each([['admin', 'wrong'], ['unknown', 'demo'], ['ada', 'wrong']])('rejects invalid credentials %s/%s', (name, password) => {
    register(fields);
    clearSession();
    expect(() => login(name, password)).toThrow('Invalid username or password.');
    expect(getSession()).toBeNull();
  });
  it.each([[null, 'demo'], ['ada', null], ['', 'demo'], ['ada', '   '], [{}, 'demo']])('rejects non-string or blank login inputs', (name, password) => {
    expect(() => login(name, password)).toThrow('required');
  });
  it('derives trusted role and display name rather than session claims', () => {
    const session = register(fields);
    localStorage.setItem('writespace_session', JSON.stringify({ ...session, role: 'admin', displayName: 'Forged' }));
    expect(getSession()).toEqual(session);
    expect(setSession({ ...session, role: 'admin', displayName: 'Forged' })).toEqual(session);
    expect(JSON.parse(localStorage.getItem('writespace_session')).role).toBe('user');
  });
  it('uses current account role/name and clears deleted-account sessions', () => {
    const session = register(fields);
    saveUsers([{ ...getUsers()[0], displayName: 'Updated', role: 'admin' }]);
    expect(getSession()).toEqual({ ...session, displayName: 'Updated', role: 'admin' });
    saveUsers([]);
    expect(getSession()).toBeNull();
    expect(localStorage.getItem('writespace_session')).toBeNull();
  });
  it.each(['{', 'null', '{}', '[]', '"text"'])('clears malformed session %s', (raw) => {
    localStorage.setItem('writespace_session', raw);
    expect(getSession()).toBeNull();
    expect(localStorage.getItem('writespace_session')).toBeNull();
  });
  it.each(['userId', 'username', 'displayName', 'role'])('rejects missing session %s', (field) => {
    const session = login('admin', 'admin');
    delete session[field];
    localStorage.setItem('writespace_session', JSON.stringify(session));
    expect(getSession()).toBeNull();
    expect(() => setSession(session)).toThrow('invalid account');
  });
  it('rejects mismatched usernames and nonexistent account identifiers', () => {
    const session = register(fields);
    expect(() => setSession({ ...session, username: 'other' })).toThrow('invalid account');
    expect(() => setSession({ ...session, userId: 'missing' })).toThrow('invalid account');
  });
  it('fails closed on malformed users and inaccessible reads or cleanup', () => {
    register(fields);
    localStorage.setItem('writespace_users', '[{}]');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(getSession()).toBeNull();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(getSession()).toBeNull();
  });
  it('does not report login or setSession success on failed writes', () => {
    const session = login('admin', 'admin');
    clearSession();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => login('admin', 'admin')).toThrow('Unable to save your session');
    expect(() => setSession(session)).toThrow('Unable to save your session');
    expect(getSession()).toBeNull();
  });
  it('reports failed logout and retains the persisted identity', () => {
    const session = login('admin', 'admin');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => clearSession()).toThrow('Unable to log out');
    expect(getSession()).toEqual(session);
  });
  it('returns null when no session is stored', () => expect(getSession()).toBeNull());
});

describe('registration', () => {
  it('trims names, generates UUID/date, and persists only a user role', () => {
    const session = register({ ...fields, displayName: ' Ada ', username: ' ada ', role: 'admin' });
    expect(session).toMatchObject({ displayName: 'Ada', username: 'ada', role: 'user' });
    const account = getUsers()[0];
    expect(account.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(account.createdAt).toISOString()).toBe(account.createdAt);
    expect(account.password).toBe('demo');
    expect(account).not.toHaveProperty('confirmPassword');
    expect(getSession()).toEqual(session);
  });
  it.each(Object.keys(fields))('requires field %s', (field) => {
    for (const invalid of [undefined, null, {}, '', '   ']) {
      expect(() => register({ ...fields, [field]: invalid })).toThrow('All fields are required');
    }
    expect(getUsers()).toEqual([]);
    expect(getSession()).toBeNull();
  });
  it('rejects absent input and mismatched confirmation', () => {
    expect(() => register()).toThrow('required');
    expect(() => register({ ...fields, confirmPassword: 'other' })).toThrow('Passwords must match');
    expect(getUsers()).toEqual([]);
  });
  it('rejects both default admin and existing usernames without altering stored accounts', () => {
    register(fields);
    const users = getUsers();
    expect(() => register(fields)).toThrow('Username is already taken');
    expect(() => register({ ...fields, username: ' admin ' })).toThrow('Username is already taken');
    expect(getUsers()).toEqual(users);
  });
  it('allows case-distinct usernames and large names without invented limits', () => {
    register(fields);
    register({ ...fields, username: 'Ada', displayName: 'a'.repeat(1000) });
    expect(getUsers()).toHaveLength(2);
  });
  it('reports unavailable UUID generation without saving', () => {
    vi.stubGlobal('crypto', {});
    expect(() => register(fields)).toThrow('current browser');
    expect(getUsers()).toEqual([]);
  });
  it('reports account-write failure without session success', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => register(fields)).toThrow('Unable to save data');
    expect(getUsers()).toEqual([]);
    expect(getSession()).toBeNull();
  });
  it('rolls back account if only session writing fails', () => {
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'writespace_session') throw new Error('quota');
      return original.call(this, key, value);
    });
    expect(() => register(fields)).toThrow('Unable to save your session');
    expect(getUsers()).toEqual([]);
    expect(getSession()).toBeNull();
  });
  it('discloses a retained account if both session write and rollback fail', () => {
    const original = Storage.prototype.setItem;
    let writes = 0;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (++writes > 1) throw new Error('quota');
      return original.call(this, key, value);
    });
    expect(() => register(fields)).toThrow('Your account was saved; use Login');
    expect(getUsers()).toHaveLength(1);
    expect(getSession()).toBeNull();
  });
});

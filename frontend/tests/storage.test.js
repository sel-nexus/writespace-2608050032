/** Verify real browser-local persistence, complete schemas, and read/write failure boundaries. */
import { describe, it, expect, vi } from 'vitest';
import { getPosts, savePosts, getUsers, saveUsers, isRequiredString } from '../src/utils/storage';
const id = '12345678-1234-4123-8123-123456789abc';
const user = { id, displayName: 'Ada', username: 'ada', password: 'demo', role: 'user', createdAt: '2024-01-01T00:00:00.000Z' };
const post = { id, title: 'First thought', content: 'Words', authorId: id, authorName: 'Ada', createdAt: user.createdAt };

describe.each([
  ['posts', 'writespace_posts', post, getPosts, savePosts],
  ['users', 'writespace_users', user, getUsers, saveUsers],
])('%s storage', (_, key, entity, read, save) => {
  it('persists and re-reads complete entities', () => {
    save([entity]);
    expect(read()).toEqual([entity]);
    expect(JSON.parse(localStorage.getItem(key))).toEqual([entity]);
    save([]);
    expect(read()).toEqual([]);
  });
  it.each(['{', 'null', '{}', '1', '"text"', '[null]', '[false]'])('degrades malformed collection %s to empty', (raw) => {
    localStorage.setItem(key, raw);
    expect(read()).toEqual([]);
  });
  it.each(Object.keys(entity))('rejects missing field %s on both read and write', (field) => {
    const invalid = { ...entity };
    delete invalid[field];
    localStorage.setItem(key, JSON.stringify([invalid]));
    expect(read()).toEqual([]);
    expect(() => save([invalid])).toThrow('Cannot save invalid data');
  });
  it.each(Object.keys(entity))('rejects wrong type for field %s', (field) => {
    localStorage.setItem(key, JSON.stringify([{ ...entity, [field]: {} }]));
    expect(read()).toEqual([]);
  });
  it('rejects duplicate IDs and mixed valid/invalid arrays', () => {
    expect(() => save([entity, entity])).toThrow('invalid data');
    localStorage.setItem(key, JSON.stringify([entity, {}]));
    expect(read()).toEqual([]);
  });
  it.each(['', 'not-a-date', '2024-02-30T00:00:00.000Z', '2024-01-01'])('rejects invalid timestamp %s', (createdAt) => {
    expect(() => save([{ ...entity, createdAt }])).toThrow('invalid data');
  });
  it('returns empty for missing data and unavailable reads', () => {
    expect(read()).toEqual([]);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(read()).toEqual([]);
  });
  it('reports unavailable writes and preserves previous records', () => {
    save([entity]);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => save([])).toThrow('Enable browser storage');
    expect(read()).toEqual([entity]);
  });
  it.each([null, {}, 'array', 123])('rejects non-array write %s', (value) => {
    expect(() => save(value)).toThrow('invalid data');
  });
});

it.each(['title', 'content', 'authorName'])('rejects whitespace-only post %s', (field) => {
  expect(() => savePosts([{ ...post, [field]: '  ' }])).toThrow('invalid data');
});
it.each(['displayName', 'username', 'password'])('rejects whitespace-only account %s', (field) => {
  expect(() => saveUsers([{ ...user, [field]: '  ' }])).toThrow('invalid data');
});
it('allows default admin authors but rejects invalid author identifiers', () => {
  savePosts([{ ...post, authorId: 'admin' }]);
  expect(getPosts()[0].authorId).toBe('admin');
  expect(() => savePosts([{ ...post, authorId: 'unknown' }])).toThrow('invalid data');
});
it('rejects reserved admin username, unknown roles, and duplicate usernames', () => {
  expect(() => saveUsers([{ ...user, username: 'admin' }])).toThrow('invalid data');
  expect(() => saveUsers([{ ...user, role: 'owner' }])).toThrow('invalid data');
  expect(() => saveUsers([user, { ...user, id: '22345678-1234-4123-8123-123456789abc' }])).toThrow('invalid data');
});
it('preserves long plain text without interpreting markup', () => {
  const content = '<script>alert(1)</script>'.repeat(1000);
  savePosts([{ ...post, content }]);
  expect(getPosts()[0].content).toBe(content);
});
it.each([null, 0, {}, [], '', '   '])('does not coerce required string %s', (value) => {
  expect(isRequiredString(value)).toBe(false);
});
it('accepts nonempty string values', () => expect(isRequiredString(' text ')).toBe(true));

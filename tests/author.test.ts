import { toAuthor } from '../src/lib/author';

describe('toAuthor', () => {
  it('uses trimmed username when non-empty', () => {
    expect(
      toAuthor({
        subjectId: 'sub-1',
        username: '  alice  ',
        firstName: 'A',
        lastName: 'B',
      })
    ).toEqual({ id: 'sub-1', displayName: 'alice' });
  });

  it('uses first and last name when username is empty', () => {
    expect(
      toAuthor({
        subjectId: 'sub-2',
        username: '   ',
        firstName: 'Ann',
        lastName: 'Lee',
      })
    ).toEqual({ id: 'sub-2', displayName: 'Ann Lee' });
  });

  it('falls back to Unknown user when nothing usable', () => {
    expect(
      toAuthor({
        subjectId: 'sub-3',
        username: '',
        firstName: '',
        lastName: '',
      })
    ).toEqual({ id: 'sub-3', displayName: 'Unknown user' });
  });
});

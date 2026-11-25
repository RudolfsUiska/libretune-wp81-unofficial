import { __resetRecent, byRecent, markShown } from '../recentPages';
import { elementAt, pathOf } from '../scrollMemory';

describe('open pages order', () => {
  afterEach(() => __resetRecent());

  it('lists the most recently shown first, unseen ones after in their order', () => {
    const tabs = ['a', 'b', 'c', 'd'];
    markShown('b');
    markShown('d');
    markShown('b');
    expect(byRecent(tabs, (t) => t)).toEqual(['b', 'd', 'a', 'c']);
  });
});

describe('scroll memory paths', () => {
  it('finds the same scroller again by its child-index path', () => {
    const root = document.createElement('div');
    root.innerHTML = '<header></header><div><p></p><ul class="list"></ul></div>';
    const list = root.querySelector('.list')!;
    const path = pathOf(root, list);
    expect(path).toBe('1/1');
    expect(elementAt(root, path!)).toBe(list);
    expect(pathOf(root, document.createElement('div'))).toBeNull();
  });
});

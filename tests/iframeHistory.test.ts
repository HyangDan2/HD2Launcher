import assert from 'node:assert/strict';
import test from 'node:test';
import {
  IframeHistoryTracker,
  type FrameWindowLike,
} from '../src/data/iframeHistory.ts';

function makeMockFrameWindow(opts?: {
  hasNavigation?: boolean;
  canGoBack?: boolean;
  crossOrigin?: boolean;
}) {
  let historyBackCalls = 0;
  let navBackCalls = 0;

  const frameWin = {
    history: {
      back() {
        historyBackCalls += 1;
      },
    },
  } as unknown as FrameWindowLike;

  if (opts?.crossOrigin) {
    Object.defineProperty(frameWin, 'navigation', {
      get() {
        throw new Error('SecurityError: cross-origin');
      },
    });
  } else if (opts?.hasNavigation) {
    let canGoBack = Boolean(opts.canGoBack);
    frameWin.navigation = {
      get canGoBack() {
        return canGoBack;
      },
      back() {
        navBackCalls += 1;
        canGoBack = false;
        return {
          committed: Promise.resolve(),
          finished: Promise.resolve(),
        };
      },
    };
  }

  return {
    frameWin,
    get historyBackCalls() {
      return historyBackCalls;
    },
    get navBackCalls() {
      return navBackCalls;
    },
  };
}

test('iOS Safari / iOS Chrome (no Navigation API): steps back one page at a time before closing', () => {
  const tracker = new IframeHistoryTracker();
  const mock = makeMockFrameWindow({ hasNavigation: false });
  const hostWin = { history: { back() { throw new Error('host history should not be used for same-origin'); } } } as unknown as Window;

  // Initial entry + 2 internal navigations
  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/stories/');
  assert.equal(tracker.depth, 0);

  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/stories/works/a/');
  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/stories/works/a/episodes/1/');
  assert.equal(tracker.depth, 2);

  // Back #1: episodes/1 -> works/a
  assert.equal(tracker.goBack(mock.frameWin, hostWin), true);
  assert.equal(mock.historyBackCalls, 1);
  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/stories/works/a/');
  assert.equal(tracker.depth, 1);

  // Back #2: works/a -> stories/
  assert.equal(tracker.goBack(mock.frameWin, hostWin), true);
  assert.equal(mock.historyBackCalls, 2);
  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/stories/');
  assert.equal(tracker.depth, 0);

  // Back #3 at entry: returns false so launcher closes the app
  assert.equal(tracker.goBack(mock.frameWin, hostWin), false);
  assert.equal(mock.historyBackCalls, 2);
});

test('Same-origin SPA replaceState does not inflate history depth', () => {
  const tracker = new IframeHistoryTracker();
  const mock = makeMockFrameWindow({ hasNavigation: false });

  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/HD2AI/');
  tracker.replaceSameOriginUrl('https://hd2lab.duckdns.org/HD2AI/?session=abc');
  assert.equal(tracker.depth, 0);
  assert.equal(tracker.goBack(mock.frameWin), false);

  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/HD2AI/settings');
  assert.equal(tracker.depth, 1);
  assert.equal(tracker.goBack(mock.frameWin), true);
  assert.equal(mock.historyBackCalls, 1);
});

test('Chrome Navigation API: uses navigation.back() and guards duplicate rapid taps', () => {
  const tracker = new IframeHistoryTracker();
  const mock = makeMockFrameWindow({ hasNavigation: true, canGoBack: true });

  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/stories/');
  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/stories/works/a/');

  assert.equal(tracker.goBack(mock.frameWin), true);
  assert.equal(mock.navBackCalls, 1);

  // Rapid second tap while first navigation is still pending
  assert.equal(tracker.goBack(mock.frameWin), true);
  assert.equal(mock.navBackCalls, 1);

  // After load finishes, depth is 0 and canGoBack is false -> returns false (close app)
  tracker.onLoadCleared();
  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/stories/');
  assert.equal(tracker.goBack(mock.frameWin), false);
});

test('Cross-origin iframe: tracks load depth and steps back via host history safely', () => {
  const tracker = new IframeHistoryTracker();
  const mock = makeMockFrameWindow({ crossOrigin: true });
  let hostBackCalls = 0;
  const hostWin = {
    history: {
      back() {
        hostBackCalls += 1;
      },
    },
  } as unknown as Window;

  // Initial load -> entry screen
  tracker.recordCrossOriginLoad();
  assert.equal(tracker.depth, 0);
  assert.equal(tracker.goBack(mock.frameWin, hostWin), false);
  assert.equal(hostBackCalls, 0);

  // Internal navigation -> depth 1
  tracker.recordCrossOriginLoad();
  assert.equal(tracker.depth, 1);

  // Back #1 -> steps back inside cross-origin iframe
  assert.equal(tracker.goBack(mock.frameWin, hostWin), true);
  assert.equal(hostBackCalls, 1);
  assert.equal(tracker.depth, 0);

  // Back load event arrives -> must not increment depth
  tracker.recordCrossOriginLoad();
  assert.equal(tracker.depth, 0);

  // Back #2 -> returns false to close app
  assert.equal(tracker.goBack(mock.frameWin, hostWin), false);
  assert.equal(hostBackCalls, 1);
});

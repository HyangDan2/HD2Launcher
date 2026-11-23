import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DoubleBackExitGuard,
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

test('Same-origin SPA bridge (hd2LauncherControls.goBack) takes priority over browser history', () => {
  const tracker = new IframeHistoryTracker();
  const mock = makeMockFrameWindow({ hasNavigation: false });
  let steps = 2;
  mock.frameWin.hd2LauncherControls = {
    goBack() {
      if (steps > 0) {
        steps -= 1;
        return true;
      }
      return false;
    },
  };

  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/sona/');
  assert.equal(tracker.depth, 0);

  // Even with browser history depth === 0, app bridge handles modal/drawer/tab back steps
  assert.equal(tracker.goBack(mock.frameWin), true);
  assert.equal(steps, 1);
  assert.equal(mock.historyBackCalls, 0);

  assert.equal(tracker.goBack(mock.frameWin), true);
  assert.equal(steps, 0);
  assert.equal(mock.historyBackCalls, 0);

  // Once app bridge returns false and browser history depth is 0 -> returns false
  assert.equal(tracker.goBack(mock.frameWin), false);
  assert.equal(mock.historyBackCalls, 0);
});

test('Same-origin SPA bridge throwing error falls through safely to browser history', () => {
  const tracker = new IframeHistoryTracker();
  const mock = makeMockFrameWindow({ hasNavigation: false });
  mock.frameWin.hd2LauncherControls = {
    goBack() {
      throw new Error('bridge error');
    },
  };

  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/lingo/');
  tracker.recordSameOriginUrl('https://hd2lab.duckdns.org/lingo/#lesson-1');
  assert.equal(tracker.goBack(mock.frameWin), true);
  assert.equal(mock.historyBackCalls, 1);
});

test('DoubleBackExitGuard requires second tap within window and resets properly', () => {
  const guard = new DoubleBackExitGuard(2000);

  // First tap arms exit window
  assert.equal(guard.attemptExit(1000), false);
  // Second tap within 2000ms confirms exit
  assert.equal(guard.attemptExit(2500), true);
  // Next tap starts fresh
  assert.equal(guard.attemptExit(2600), false);
  // Tap after window expires re-arms instead of exiting
  assert.equal(guard.attemptExit(5000), false);
  // Reset clears armed state
  guard.reset();
  assert.equal(guard.attemptExit(5100), false);
  assert.equal(guard.attemptExit(7100), true);
});

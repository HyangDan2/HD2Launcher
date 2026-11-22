export interface FrameNavigationLike {
  canGoBack: boolean;
  back: () => { committed: Promise<unknown>; finished: Promise<unknown> };
}

export type FrameWindowLike = Window & {
  navigation?: FrameNavigationLike;
  __hd2LauncherHistoryPatched?: boolean;
};

/**
 * Pure history-depth tracker for an embedded iframe.
 * Works across:
 * 1) Browsers with Navigation API (Chrome / Edge / Android Chrome)
 * 2) Same-origin iframes without Navigation API (iOS Safari / iOS Chrome / Firefox)
 *    via load + pushState/replaceState/hashchange/popstate tracking
 * 3) Cross-origin iframes via load-count depth tracking
 */
export class IframeHistoryTracker {
  private urlStack: string[] = [];
  private isCrossOrigin = false;
  private hasLoadedOnce = false;
  private crossOriginDepth = 0;
  private goingBack = false;
  private pendingNavigation: FrameNavigationLike | undefined;

  reset(): void {
    this.urlStack = [];
    this.isCrossOrigin = false;
    this.hasLoadedOnce = false;
    this.crossOriginDepth = 0;
    this.goingBack = false;
    this.pendingNavigation = undefined;
  }

  onLoadCleared(): void {
    this.pendingNavigation = undefined;
  }

  recordSameOriginUrl(href: string): void {
    if (!href || href === 'about:blank') return;
    this.isCrossOrigin = false;

    if (this.goingBack) {
      this.goingBack = false;
      const idx = this.urlStack.lastIndexOf(href);
      if (idx !== -1) {
        this.urlStack = this.urlStack.slice(0, idx + 1);
      } else if (this.urlStack.length === 0) {
        this.urlStack = [href];
      }
      return;
    }

    if (
      this.urlStack.length === 0 ||
      this.urlStack[this.urlStack.length - 1] !== href
    ) {
      this.urlStack.push(href);
    }
  }

  replaceSameOriginUrl(href: string): void {
    if (!href || href === 'about:blank') return;
    this.isCrossOrigin = false;
    if (this.urlStack.length > 0) {
      this.urlStack[this.urlStack.length - 1] = href;
    } else {
      this.urlStack = [href];
    }
  }

  recordCrossOriginLoad(): void {
    this.isCrossOrigin = true;
    if (!this.hasLoadedOnce) {
      this.hasLoadedOnce = true;
      this.crossOriginDepth = 0;
    } else if (this.goingBack) {
      this.goingBack = false;
    } else {
      this.crossOriginDepth += 1;
    }
  }

  get depth(): number {
    return this.isCrossOrigin
      ? this.crossOriginDepth
      : Math.max(0, this.urlStack.length - 1);
  }

  goBack(
    frameWindow: FrameWindowLike | null | undefined,
    hostWindow?: Pick<Window, 'history'>,
  ): boolean {
    if (!frameWindow) return false;

    // 1. Prefer Navigation API when available on same-origin iframes (Chrome/Edge)
    try {
      const navigation = frameWindow.navigation;
      if (navigation) {
        if (this.pendingNavigation === navigation) return true;
        if (navigation.canGoBack) {
          const { committed, finished } = navigation.back();
          this.pendingNavigation = navigation;
          void committed.catch(() => {}).finally(() => {
            if (this.pendingNavigation === navigation) {
              this.pendingNavigation = undefined;
            }
          });
          void finished.catch(() => {});
          if (this.urlStack.length > 1) {
            this.goingBack = true;
            this.urlStack.pop();
          }
          return true;
        }
        // If Navigation API reports canGoBack=false AND our stack agrees, we're at entry
        if (this.urlStack.length <= 1) {
          return false;
        }
      }
    } catch {
      // Cross-origin frameWindow.navigation throws SecurityError -> fall through
    }

    // 2. Same-origin fallback (iOS Safari, iOS Chrome/WebKit, Firefox)
    if (!this.isCrossOrigin) {
      if (this.urlStack.length > 1) {
        this.goingBack = true;
        this.urlStack.pop();
        try {
          frameWindow.history.back();
          return true;
        } catch {
          this.goingBack = false;
          return false;
        }
      }
      return false;
    }

    // 3. Cross-origin fallback (only step back if we observed > 0 navigations)
    if (this.crossOriginDepth > 0) {
      const targetHost =
        hostWindow ?? (typeof window !== 'undefined' ? window : undefined);
      if (!targetHost) return false;
      this.goingBack = true;
      this.crossOriginDepth -= 1;
      targetHost.history.back();
      return true;
    }

    return false;
  }
}

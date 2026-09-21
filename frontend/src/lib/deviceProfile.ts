export type DeviceKind = "phone" | "tablet" | "desktop";
export type DeviceOrientation = "portrait" | "landscape";
export type DeviceLayout =
  | "phone-portrait"
  | "compact-landscape"
  | "tablet-portrait"
  | "desktop";

export interface DeviceProfile {
  kind: DeviceKind;
  orientation: DeviceOrientation;
  compact: boolean;
  layout: DeviceLayout;
}

interface NavigatorWithHints extends Navigator {
  userAgentData?: { mobile?: boolean };
}

export function getDeviceProfile(): DeviceProfile {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const navigatorWithHints = navigator as NavigatorWithHints;
  const userAgent = navigator.userAgent;
  const isIPad =
    /iPad/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
  const isAndroidTablet = /Android/i.test(userAgent) && !/Mobile/i.test(userAgent);
  const reportsMobile =
    navigatorWithHints.userAgentData?.mobile ??
    /Android|iPhone|iPod|IEMobile|Opera Mini/i.test(userAgent);
  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);

  let kind: DeviceKind;
  if (isIPad || isAndroidTablet || (hasCoarsePointer && shortSide >= 600)) {
    kind = "tablet";
  } else if (reportsMobile || (hasCoarsePointer && shortSide < 600)) {
    kind = "phone";
  } else {
    kind = "desktop";
  }

  const orientation = width >= height ? "landscape" : "portrait";
  let layout: DeviceLayout = "desktop";
  if (orientation === "landscape" && height <= 600 && width <= 1000) {
    layout = "compact-landscape";
  } else if (kind === "phone") {
    layout = "phone-portrait";
  } else if (kind === "tablet" && orientation === "portrait") {
    layout = "tablet-portrait";
  }

  return {
    kind,
    orientation,
    compact: height < 650 || width < 360 || (kind === "phone" && longSide < 700),
    layout,
  };
}

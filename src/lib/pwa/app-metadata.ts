import type { Metadata } from "next";

export const APP_THEME_COLOR = "#020617";

// Next's appleWebApp.capable emits mobile-web-app-capable; older iOS needs Apple's name too.
export const APPLE_WEB_APP_TAGS = { "apple-mobile-web-app-capable": "yes" };

function buildStartupImage(device: { width: number; height: number; pixelRatio: number }) {
  const width = device.width * device.pixelRatio;
  const height = device.height * device.pixelRatio;
  return {
    url: `/icons/apple-startup-${width}x${height}.png`, width, height,
    media: `screen and (device-width: ${device.width}px) and (device-height: ${device.height}px) and (-webkit-device-pixel-ratio: ${device.pixelRatio}) and (orientation: portrait)`,
  };
}

export const APP_STARTUP_IMAGES = [{ width: 430, height: 932, pixelRatio: 3 }].map(buildStartupImage);

export const APPLE_WEB_APP = {
  capable: true,
  title: "ДнД",
  statusBarStyle: "black-translucent",
  startupImage: APP_STARTUP_IMAGES.map(({ url, media }) => ({ url, media })),
} satisfies NonNullable<Metadata["appleWebApp"]>;

export const MAX_CROP_ZOOM = 4;

export type CropState = {
  viewport: number;
  imageWidth: number;
  imageHeight: number;
  zoom: number;
  offsetX: number;
  offsetY: number;
};

export type SourceSquare = { x: number; y: number; size: number };

export function buildCenteredCrop(viewport: number, imageWidth: number, imageHeight: number): CropState {
  const initial = { viewport, imageWidth, imageHeight, zoom: 1, offsetX: 0, offsetY: 0 };
  const scale = findDisplayScale(initial);
  return clampCrop({ ...initial, offsetX: (viewport - imageWidth * scale) / 2, offsetY: (viewport - imageHeight * scale) / 2 });
}

export function moveCrop(state: CropState, deltaX: number, deltaY: number): CropState {
  return clampCrop({ ...state, offsetX: state.offsetX + deltaX, offsetY: state.offsetY + deltaY });
}

export function zoomCrop(state: CropState, nextZoom: number, anchor = { x: state.viewport / 2, y: state.viewport / 2 }): CropState {
  const zoom = Math.min(MAX_CROP_ZOOM, Math.max(1, nextZoom));
  const ratio = zoom / state.zoom;
  return clampCrop({
    ...state,
    zoom,
    offsetX: anchor.x - (anchor.x - state.offsetX) * ratio,
    offsetY: anchor.y - (anchor.y - state.offsetY) * ratio,
  });
}

export function findDisplayScale(state: CropState): number {
  return (state.viewport / Math.min(state.imageWidth, state.imageHeight)) * state.zoom;
}

export function findSourceSquare(state: CropState): SourceSquare {
  const scale = findDisplayScale(state);
  return { x: (0 - state.offsetX) / scale, y: (0 - state.offsetY) / scale, size: state.viewport / scale };
}

function clampCrop(state: CropState): CropState {
  const scale = findDisplayScale(state);
  return {
    ...state,
    offsetX: clampOffset(state.offsetX, state.viewport - state.imageWidth * scale),
    offsetY: clampOffset(state.offsetY, state.viewport - state.imageHeight * scale),
  };
}

function clampOffset(offset: number, minimum: number): number {
  return Math.min(0, Math.max(minimum, offset));
}

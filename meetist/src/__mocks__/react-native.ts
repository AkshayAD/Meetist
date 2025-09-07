export const Platform = {
  OS: 'android',
  Version: '11',
  select: (obj: any) => obj.android || obj.default,
};

export const Dimensions = {
  get: () => ({ width: 400, height: 800 }),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

export const Alert = {
  alert: jest.fn(),
};

export const StyleSheet = {
  create: (styles: any) => styles,
  hairlineWidth: 1,
  absoluteFillObject: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  flatten: (styles: any) => styles,
};

export default {
  Platform,
  Dimensions,
  Alert,
  StyleSheet,
};
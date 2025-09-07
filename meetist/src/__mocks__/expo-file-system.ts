export const documentDirectory = '/test/documents/';
export const EncodingType = {
  Base64: 'base64',
  UTF8: 'utf8',
};

export const readAsStringAsync = jest.fn();
export const writeAsStringAsync = jest.fn();
export const getInfoAsync = jest.fn();
export const downloadAsync = jest.fn();
export const deleteAsync = jest.fn();
export const moveAsync = jest.fn();
export const copyAsync = jest.fn();
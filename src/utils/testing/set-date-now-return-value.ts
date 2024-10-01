export function setDateNowReturnValue(milliseconds: number) {
  global.Date.now = jest.fn(() => milliseconds);
  return milliseconds;
}

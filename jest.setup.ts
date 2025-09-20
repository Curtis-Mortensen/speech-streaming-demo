import '@testing-library/jest-dom';

// MatchMedia mock (used in timers/animations)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
});

// fetch mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).fetch = jest.fn();

// Minimal MediaStream mock
class MockMediaStream {}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(global as any).MediaStream = MockMediaStream as unknown as MediaStream;

// getUserMedia mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (!(navigator as any).mediaDevices) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (navigator as any).mediaDevices = {};
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(navigator as any).mediaDevices.getUserMedia = jest.fn().mockResolvedValue(new MockMediaStream());

// Minimal MediaRecorder mock
type MediaRecorderEventHandler = ((ev: BlobEvent | Event) => void) | null;

class MockMediaRecorder {
  public state: 'inactive' | 'recording' | 'paused' = 'inactive';
  public mimeType = 'audio/webm;codecs=opus';
  public ondataavailable: MediaRecorderEventHandler = null;
  public onstart: MediaRecorderEventHandler = null;
  public onstop: MediaRecorderEventHandler = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_stream: any, _options?: any) {}

  start(): void {
    this.state = 'recording';
    if (this.onstart) this.onstart(new Event('start'));
  }

  stop(): void {
    this.state = 'inactive';
    // Provide a tiny empty blob to any dataavailable listener
    if (this.ondataavailable) {
      const blob = new Blob([], { type: this.mimeType });
      const ev = { data: blob } as BlobEvent;
      this.ondataavailable(ev);
    }
    if (this.onstop) this.onstop(new Event('stop'));
  }

  // Static convenience
  static isTypeSupported(_mime: string): boolean {
    return true;
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(global as any).MediaRecorder = MockMediaRecorder as unknown as typeof MediaRecorder;

// URL stubs
const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

// Provide deterministic object URLs in tests
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(URL as any).createObjectURL = (_obj: Blob) => 'blob:mock-url';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(URL as any).revokeObjectURL = (_url: string) => {};

// Ensure we can restore if needed in future tests
afterAll(() => {
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
});
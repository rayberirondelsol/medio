// Web NFC API Type Definitions
// Based on https://w3c.github.io/web-nfc/

interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFRecord {
  recordType: string;
  mediaType?: string;
  id?: string;
  data?: DataView;
  encoding?: string;
  lang?: string;
}

interface NDEFReadingEvent extends Event {
  serialNumber: string;
  message: NDEFMessage;
}

interface NDEFReaderOptions {
  signal?: AbortSignal;
}

interface NDEFScanOptions {
  signal?: AbortSignal;
}

interface NDEFWriteOptions {
  overwrite?: boolean;
  signal?: AbortSignal;
}

declare class NDEFReader extends EventTarget {
  constructor();
  scan(options?: NDEFScanOptions): Promise<void>;
  write(message: NDEFMessage | string, options?: NDEFWriteOptions): Promise<void>;
  
  addEventListener(
    type: 'reading',
    listener: (event: NDEFReadingEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  
  addEventListener(
    type: 'readingerror',
    listener: (event: Event) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
}

interface Window {
  NDEFReader?: typeof NDEFReader;
}
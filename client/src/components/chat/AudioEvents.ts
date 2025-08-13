class AudioEventBus extends EventTarget {
  constructor() {
    super();
  }
}

export const audioEvents = new AudioEventBus();

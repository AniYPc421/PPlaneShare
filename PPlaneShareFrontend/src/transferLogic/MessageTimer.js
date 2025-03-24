export default class MessageTimer {
  constructor(interval) {
    this.messageTime = Date.now();
    this.interval = interval;
  }

  validateTime() {
    if (Date.now() - this.messageTime > this.interval) {
      return true;
    } else {
      return false;
    }
  }
}

import UserError from "../general/UserError.js";
import debugCreator from "../general/debugCreator.js";

const debug = debugCreator("CodeManager");

export class CodeNotExistError extends UserError {
  constructor(code, options) {
    super(`Given code ${code} does not exist!`, options);
  }
}

export class NoResourceError extends UserError {
  constructor(options) {
    super("No remaining codes left!", options);
  }
}

export class CodeManager {
  constructor() {
    this._codes = new Map();
  }

  _getRandomCode() {
    const [codeMin, codeMax] = [100000, 999999];
    return Math.floor(Math.random() * (codeMax - codeMin) + codeMin).toString();
  }

  get(code) {
    const codes = this._codes;
    const sender = codes.get(code);
    if (!sender) {
      throw new CodeNotExistError(code);
    }
    return sender;
  }

  add(ws) {
    const codes = this._codes;
    let code, iterCount;
    const maxIterCount = 100;
    for (iterCount = 0; iterCount < maxIterCount; iterCount++) {
      code = this._getRandomCode();
      if (!codes.get(code)) {
        break;
      }
    }
    if (iterCount >= maxIterCount) {
      throw new NoResourceError();
    }
    codes.set(code, ws);
    debug("added code %s", code);
    return code;
  }

  delete(code) {
    const codes = this._codes;
    if (!codes.has(code)) {
      throw new CodeNotExistError(code);
    }
    debug("deleted code %s", code);
    codes.delete(code);
  }
}

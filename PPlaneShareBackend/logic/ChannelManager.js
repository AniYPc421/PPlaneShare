import UserError from "../general/UserError.js";
import debugCreator from "../general/debugCreator.js";

const debug = debugCreator("ChannelManager");

class ChannelAlreadyExistsError extends UserError {
  constructor(channelId, options) {
    super(`Channel with ID ${channelId} already exists!`, options);
  }
}

class ChannelNotExistError extends UserError {
  constructor(channelId, options) {
    super(`Channel ID ${channelId} does not exist!`, options);
  }
}

export class ChannelManager {
  constructor() {
    this._channels = new Map();
  }

  add(channelId, sender, receiver) {
    const channels = this._channels;
    if (channels.get(channelId)) {
      throw new ChannelAlreadyExistsError(channelId);
    }
    channels.set(channelId, {
      sender,
      receiver,
    });
    debug("added channel with ID %s", channelId);
  }

  get(channelId, requestSide) {
    const channels = this._channels;
    const channelInfo = channels.get(channelId);
    if (!channelInfo) {
      throw new ChannelNotExistError(channelId);
    }
    if (channelInfo.sender === requestSide) {
      return channelInfo.receiver;
    } else if (channelInfo.receiver === requestSide) {
      return channelInfo.sender;
    } else {
      throw new ChannelAlreadyExistsError(channelId);
    }
  }

  delete(channelId) {
    const channels = this._channels;
    if (!channels.get(channelId)) {
      throw new ChannelNotExistError(channelId);
    }
    channels.delete(channelId);
    debug("deleted channel with ID %s", channelId);
  }
}

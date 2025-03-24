export default class RTCConnection {
  constructor(type, send, peerCloseCallback, rtcConfig) {
    const connection = new RTCPeerConnection(rtcConfig);
    switch (type) {
      case "sender": {
        this.setAnotherSDP = this._senderSetAnotherSDP;
        this.setup = this._senderSetup;
        break;
      }
      case "receiver": {
        this.setAnotherSDP = this._receiverSetAnotherSDP;
        this.setup = this._receiverSetup;
        break;
      }
      default: {
        throw new Error(`Unknown RTC peer type ${type}!`);
      }
    }
    this._connection = connection;
    this._send = send;
    this._eventListeners = [];
    this._savedIceCandidates = [];
    const modifiedPeerCloseCallback = () => {
      const connection = this._connection;
      if (
        ["new", "connecting", "connected"].includes(connection.connectionState)
      ) {
        return;
      }
      if (connection) {
        this.close();
      }
      peerCloseCallback();
    };
    connection.addEventListener(
      "connectionstatechange",
      modifiedPeerCloseCallback
    );
    this._eventListeners.push([
      connection,
      "connectionstatechange",
      modifiedPeerCloseCallback,
    ]);
  }

  async _senderSetAnotherSDP(answer) {
    const connection = this._connection;
    const savedIceCandidates = this._savedIceCandidates;
    await connection.setRemoteDescription(answer);
    if (savedIceCandidates) {
      for (const iceCandidate of savedIceCandidates) {
        await connection.addIceCandidate(iceCandidate);
      }
      savedIceCandidates.length = 0;
    }
  }

  async _receiverSetAnotherSDP(offer) {
    const connection = this._connection;
    const send = this._send;
    const savedIceCandidates = this._savedIceCandidates;
    await connection.setRemoteDescription(offer);
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    if (savedIceCandidates) {
      for (const iceCandidate of savedIceCandidates) {
        await connection.addIceCandidate(iceCandidate);
      }
      savedIceCandidates.length = 0;
    }
    send("answer", answer);
  }

  async _senderSetup(connectCallback) {
    const connection = this._connection;
    const send = this._send;
    const eventListeners = this._eventListeners;
    const dataChannel = connection.createDataChannel("fileTransfer");

    const iceCandidateListener = (event) => {
      const candidate = event.candidate;
      if (!candidate) {
        return;
      }
      send("iceCandidate", candidate);
    };
    const dataChannelOpenListener = () => {
      connectCallback(dataChannel);
    };

    connection.addEventListener("icecandidate", iceCandidateListener);
    eventListeners.push([connection, "icecandidate", iceCandidateListener]);
    dataChannel.addEventListener("open", dataChannelOpenListener);
    eventListeners.push([dataChannel, "open", dataChannelOpenListener]);

    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    send("offer", offer);
  }

  async _receiverSetup(dataCallback) {
    const connection = this._connection;
    const send = this._send;
    const eventListeners = this._eventListeners;

    const iceCandidateListener = (event) => {
      const candidate = event.candidate;
      if (!candidate) {
        return;
      }
      send("iceCandidate", candidate);
    };
    connection.addEventListener("icecandidate", iceCandidateListener);
    eventListeners.push([connection, "icecandidate", iceCandidateListener]);

    const dataChannelListener = (event) => {
      const channel = event.channel;
      channel.binaryType = "arraybuffer";

      const messageListener = (event) => {
        const data = event.data;
        dataCallback(data);
      };
      channel.addEventListener("message", messageListener);
      eventListeners.push([channel, "message", messageListener]);
    };
    connection.addEventListener("datachannel", dataChannelListener);
    eventListeners.push([connection, "datachannel", dataChannelListener]);
  }

  async addIceCandidate(iceCandidate) {
    const connection = this._connection;
    const savedIceCandidates = this._savedIceCandidates;
    if (connection.signalingState !== "stable") {
      savedIceCandidates.push(iceCandidate);
    } else {
      await connection.addIceCandidate(iceCandidate);
    }
  }

  close() {
    const connection = this._connection;
    if (connection === undefined) {
      return;
    }
    const eventListeners = this._eventListeners;
    for (const [entity, type, listener] of eventListeners) {
      entity.removeEventListener(type, listener);
    }
    connection.close();
    delete this._connection;
  }
}

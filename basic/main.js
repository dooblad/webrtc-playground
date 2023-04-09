/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint no-unused-expressions: 0 */

'use strict';

// Initialize RTCPeerConnection object
const configuration = {iceServers: [{urls: 'stun:stun.example.com'}]};
const peerConnection = new RTCPeerConnection(configuration);

// Create signaling channel (WebSocket, WebRTC data channel, etc.)
const signalingChannel = new WebSocket('ws://signaling.simplewebrtc.com');

// Exchange signaling messages with remote peer
signalingChannel.onmessage = async function(event) {
  const message = JSON.parse(event.data);
  if (message.sdp) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
    if (peerConnection.remoteDescription.type === 'offer') {
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      signalingChannel.send(JSON.stringify({'sdp': peerConnection.localDescription}));
    }
  } else if (message.ice) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(message.ice));
    } catch (error) {
      console.error(error);
    }
  }
};

// Create local SDP and send to remote peer
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);
signalingChannel.send(JSON.stringify({'sdp': peerConnection.localDescription}));

peerConnection.onicecandidate = function(event) {
  if (event.candidate) {
    signalingChannel.send(JSON.stringify({'ice': event.candidate}));
  }
};

// Create data channel
const dataChannel = peerConnection.createDataChannel('my-channel');

// Send message to remote peer
dataChannel.send('Hello, remote peer!');

// Receive message from remote peer
dataChannel.onmessage = function(event) {
  console.log('Received message:', event.data);
};

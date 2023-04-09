/*
 *  Copyright (c) 2018 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */
/* eslint no-unused-expressions: 0 */

'use strict';
console.log('Hello, world!');

// Initialize RTCPeerConnection object
// const configuration = {iceServers: [{urls: 'stun:stun.example.com'}]};
const configuration = null;
const peerConnection = new RTCPeerConnection(configuration);

// Create signaling channel (WebSocket, WebRTC data channel, etc.)
const signalingChannel = new WebSocket('ws://punk5.space:8090');

// Exchange signaling messages with remote peer
signalingChannel.onmessage = function(event) {
  console.log('Received signaling channel message:', event.data);
  if (event.data instanceof Blob) {
    const reader = new FileReader();
    reader.onload = function() {
      const message = JSON.parse(reader.result);
      processSignalingMessage(message);
    };
    reader.readAsText(event.data);
  } else {
    const message = JSON.parse(event.data);
    processSignalingMessage(message);
  }
};

function processSignalingMessage(message) {
  console.log('Signaling channel parsed message:', message);
  if (message.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp))
    .then(function() {
      if (peerConnection.remoteDescription.type === 'offer') {
        peerConnection.createAnswer()
        .then(function(answer) {
          return peerConnection.setLocalDescription(answer);
        })
        .then(function() {
          signalingChannel.send(JSON.stringify({'sdp': peerConnection.localDescription}));
        });
      }
    });
  } else if (message.ice) {
    peerConnection.addIceCandidate(new RTCIceCandidate(message.ice))
    .catch(function(error) {
      console.error(error);
    });
  } else if (message.msg) {
    console.log('Received signalchannel message from peer:', message.msg);
  }
}

signalingChannel.onopen = function(event) {
  console.log('Signaling channel open');
  // Create local SDP and send to remote peer
  peerConnection.createOffer()
  .then(function(offer) {
    return peerConnection.setLocalDescription(offer);
  })
  .then(function() {
    signalingChannel.send(JSON.stringify({'sdp': peerConnection.localDescription}));
  });

  peerConnection.onicecandidate = function(event) {
    if (event.candidate) {
      signalingChannel.send(JSON.stringify({'ice': event.candidate}));
    }
  };

  signalingChannel.send(JSON.stringify({'msg': 'You are all my bitches!'}));
};

// Create a data channel for sending and receiving messages
const dataChannel = peerConnection.createDataChannel('messages');
dataChannel.onmessage = function(event) {
  console.log('Received datachannel message:', event.data);
};
dataChannel.onopen = function(event) {
  dataChannel.send(JSON.stringify({'msg': 'Ayy Lmao'}));
};

// Handle remote data channel
peerConnection.ondatachannel = function(event) {
  const remoteDataChannel = event.channel;
  remoteDataChannel.onmessage = function(event) {
    const message = JSON.parse(event.data);
    console.log('Received peer connection datachannel message:', message.msg);
  };
};

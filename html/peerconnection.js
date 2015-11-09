var PeerConnection = (window.RTCPeerConnection || window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection);
var URL = (window.URL || window.webkitURL || window.mozURL || window.msURL );
var getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);
var nativeRTCIceCandidate = (window.RTCIceCandidate || window.mozRTCIceCandidate);
var nativeRTCSessionDescription = (window.RTCSessionDescription || window.mozRTCSessionDescription);
var localstream;
var sdpConstraints = {'mandatory': {
  'OfferToReceiveAudio':true,
  'OfferToReceiveVideo':true }};
// STUN或者TURN服务器的列表
var iceServer = {
  iceServers: [
      {url: "stun:23.21.150.121"},
      {url: "stun:stun.l.google.com:19302"},
	  {url: "stun:124.124.124.2"},  //firefox
      {url: "turn:numb.viagenie.ca", credential: "xxxx", username: "xxx"}
  ]
};
// 协议元数据的参数设置
var options = {
  optional: [
      {DtlsSrtpKeyAgreement: false},  
      {RtpDataChannels: false}
  ]
};

// var chromeMediaSourceId = 2;
// var mediaOptions = {
  // audio: false,
  // video: {
      // mandatory: {
          // chromeMediaSource: 'desktop',
          // chromeMediaSourceId: chromeMediaSourceId,
          // minWidth: 1280,
          // minHeight: 720,
          
          // maxWidth: 1920,
          // maxHeight: 1080,
          
          // minAspectRatio: 1.77
      // }
  // }
// }
// {audio:true, video:true}
var mediaOptions = {
  audio: true,  
  video: true,
};

var pc = null;
var pc_ = null;
var is_request_side = 2;

function openLocalCamera() {
  try {
    getUserMedia(mediaOptions, gotLocalStream, function() {});
  } catch (e) {
    trace("error: " + e.description);
  }
}
// Attach a media stream to an element.
attachMediaStream = function(element, stream) {
  if (typeof element.srcObject !== 'undefined') {
    element.srcObject = stream;
  } else if (typeof element.mozSrcObject !== 'undefined') {
    element.mozSrcObject = stream;
  } else if (typeof element.src !== 'undefined') {
    element.src = URL.createObjectURL(stream);
  } else {
    console.log('Error attaching stream to element.');
  }
};  

function gotLocalStream(stream) {
  trace("Received local stream");
  localstream = stream;
  str = "<video id='vid1' muted autoplay></video>";
  addVideoLabel(str);
  attachMediaStream(vid1, stream);
} 

function gotRemoteStream(e) {
  str = "<video id='vid2' style='align:right' autoplay></video>";
  addVideoLabel(str);
  attachMediaStream(vid2, e.stream);
  trace("Received remote stream");
}

function start() {
  is_request_side = 1;   
  trace("Starting Call");
  pc = new PeerConnection(iceServer, options);
  trace("Created PeerConnection object pc.");

  pc.addStream(localstream);
  pc.onicecandidate = iceCallback;
  pc.onaddstream = gotRemoteStream;
  trace("Adding Local Stream to PeerConnection");

  pc.createOffer(gotOfferDescription, onCreateSessionDescriptionError);
}

function gotOfferDescription(desc) {
  pc.setLocalDescription(desc, setLocalSdpSuccessCb, setLocalSdpFailureCb);
  sendSignal(JSON.stringify(desc))
  trace("Send offer: \n" + desc.sdp);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function gotAnswerDescription(desc) {
  pc_.setLocalDescription(desc, setLocalSdpSuccessCb, setLocalSdpFailureCb);
  sendSignal(JSON.stringify(desc));
  trace("Send answer\n" + desc.sdp);
}

function iceCallback(event) {
  if (event.candidate) {
    sendSignal(JSON.stringify(event.candidate)); 
    trace("Local ICE candidate: \n" + event.candidate.candidate);
  }
}

function onAddIceCandidateSuccess() {
  trace("AddIceCandidate success.");
}

function onAddIceCandidateError(error) {
  trace("Failed to add Ice Candidate: " + error.toString());
}

function setLocalSdpSuccessCb() {
  trace("SetLocalDescription Success.\n");
}

function setLocalSdpFailureCb(error) {
  trace("Failed to setLocalDescription: " + error.toString());
}

function setRemoteSdpSuccessCb() {
  trace("SetRemoteDescription Success.\n");
}

function setRemoteSdpFailureCb(error) {
  trace("Failed to setRemoteDescription: " + error.toString());
}



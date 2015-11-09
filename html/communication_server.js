var request = null;    
var hangingGet = null;  
var localName;
var server;
var my_id = -1;
var other_peers = {};
var message_counter = 0;

function trace(txt) {
  var elem = document.getElementById("debug");
  elem.innerHTML += txt + "<br>";
}

function addVideoLabel(txt) {
  var vids = document.getElementById("videos");
  vids.innerHTML += txt;
}

function SetPreContent(txt) {
  var preVids = document.getElementById("videos");
  preVids.innerHTML = txt;
}

function handleServerNotification(data) {
  trace("Server notification: " + data);
  var parsed = data.split(',');
  if (parseInt(parsed[2]) != 0) {
    other_peers[parseInt(parsed[1])] = parsed[0];
	document.getElementById("peer_id").value = parseInt(parsed[1]);
  } else {
    document.getElementById("peer_id").value = "";
  }
}

function sortMessage(peer_id, data) {
  ++message_counter;
  var msg_id;
  var str = "Message from '" + other_peers[peer_id] + "'&nbsp;";
  str += "<span id='toggle_" + message_counter + "' onclick='toggleMe(this);' ";
  if(document.getElementById("chatmode").checked) {
    str += "style='cursor: pointer'>-</span><br>";
    str += "<blockquote id='msg_" + message_counter + "' style='display:block; color:blue; font-size:18px'>";
	msg_id = 'msg_' + message_counter;
  } else {
    str += "style='cursor: pointer'>+</span><br>";
    str += "<blockquote id='msg_" + message_counter + "' style='display:none; color:blue; font-size:18px'>";
  }
  str += data + "</blockquote>";
  trace(str);
  if(document.getElementById("chatmode").checked) {
    document.getElementById(msg_id).focus();
  }
}

function handlePeerMessage(peer_id, data) {
  sortMessage(peer_id, data);
  if (document.getElementById("loopback").checked) {
    if (data.search("offer") != -1) {
      // In loopback mode, if DTLS is enabled, notify the client to disable it.
      // Otherwise replace the offer with an answer.
      if (data.search("fingerprint") != -1)
        data = data.replace("offer", "offer-loopback");
      else
        data = data.replace("offer", "answer");
    }
    sendToPeer(peer_id, data);
  } else {
    if (data.search("offer") != -1) { // 作为响应方，收到类型为offer的sdp
	  is_request_side = 2;
	  pc_ = new PeerConnection(iceServer, options);
	  pc_.addStream(localstream);
	  pc_.onicecandidate = iceCallback;
      pc_.onaddstream = gotRemoteStream;
      trace("Adding Local Stream to peer connection");
	  trace("Received offer: \n" + (JSON.parse(data)).sdp);
	  pc_.setRemoteDescription(new nativeRTCSessionDescription(JSON.parse(data)),
	                           setRemoteSdpSuccessCb, setRemoteSdpFailureCb );
	  // Since the "remote" side has no media stream we need
	  // to pass in the right constraints in order for it to
	  // accept the incoming offer of audio and video.
	  pc_.createAnswer(gotAnswerDescription, onCreateSessionDescriptionError,
                       sdpConstraints);
	} 
	if (data.search("answer") != -1) { 
	  trace("Received answer: \n" + (JSON.parse(data)).sdp);
	  pc.setRemoteDescription(new nativeRTCSessionDescription(JSON.parse(data)),
	                          setRemoteSdpSuccessCb, setRemoteSdpFailureCb );
	} 
	if (data.search("candidate") != -1) { 
	  if(is_request_side == 1) { 
	    pc.addIceCandidate(new nativeRTCIceCandidate(JSON.parse(data)),
                           onAddIceCandidateSuccess, onAddIceCandidateError);
      } else {
	    pc_.addIceCandidate(new nativeRTCIceCandidate(JSON.parse(data)),
                           onAddIceCandidateSuccess, onAddIceCandidateError);
	  }
	}
	if(data.search("BYE") != -1) { 
	  passiveStop();
	}
  }
}

function GetIntHeader(r, name) {
  var val = r.getResponseHeader(name);
  return val != null && val.length ? parseInt(val) : -1;
}

function hangingGetCallback() {
  try {
    if (hangingGet.readyState != 4)
      return;
    if (hangingGet.status != 200) {
      trace("server error: " + hangingGet.statusText);
	  if(hangingGet.status != 0) 
        disconnect();
    } else {
      var peer_id = GetIntHeader(hangingGet, "Pragma");
      if (peer_id == my_id) {  
        handleServerNotification(hangingGet.responseText);
      } else { 
        handlePeerMessage(peer_id, hangingGet.responseText);
      }
    }

    if (hangingGet) {
      hangingGet.abort();
      hangingGet = null;
    }
   
    if (my_id != -1) 
      window.setTimeout(startHangingGet, 0); 
  } catch (e) {
    trace("Hanging get error: " + e.description);
  }
}

function startHangingGet() {
  try {
    hangingGet = new XMLHttpRequest();
    hangingGet.onreadystatechange = hangingGetCallback;
    hangingGet.ontimeout = onHangingGetTimeout;
    hangingGet.open("GET", server + "/wait?peer_id=" + my_id, true); 
    hangingGet.send(); 
  } catch (e) {
    trace("error" + e.description);
	stop();
  }
}

function onHangingGetTimeout() {
  trace("hanging get timeout. issuing again.");
  hangingGet.abort();
  hangingGet = null;
  if (my_id != -1)
    window.setTimeout(startHangingGet, 0);
}

function signInCallback() {
  try {
    if (request.readyState == 4) {
      if (request.status == 200) {
		openLocalCamera(); 
        var peers = request.responseText.split("\n");  
        my_id = parseInt(peers[0].split(',')[1]);      
		localName = localName + "_" + my_id;
		document.getElementById("local").value = localName;
        trace("My id: " + my_id);
        for (var i = 1; i < peers.length; ++i) {       
          if (peers[i].length > 0) {
            trace("Peer " + i + ": " + peers[i]);
            var parsed = peers[i].split(',');
            other_peers[parseInt(parsed[1])] = parsed[0];
			document.getElementById("peer_id").value = parseInt(parsed[1]);
          }
        }
        startHangingGet();
        request = null;
      }
    }
  } catch (e) {
    trace("error: " + e.description);
  }
}

function signIn() {
  try {
    request = new XMLHttpRequest();
    request.onreadystatechange = signInCallback;
	request.onerror = function(error) {
	  alert("Error occurred: " + "Server may not online, connection refused.");
	  document.getElementById("connect").disabled = false;
	  document.getElementById("disconnect").disabled = true;
      document.getElementById("send").disabled = true;
	}
    request.open("GET", server + "/sign_in?" + localName, true);
	// request.timeout = 3000; //将超时设置为3秒
	// request.ontimeout = function() {
	  // document.getElementById("connect").disabled = false;
	  // document.getElementById("disconnect").disabled = true;
      // document.getElementById("send").disabled = true;
	  // alert("Failed to connect to the server!");
	// }
    request.send();
  } catch (e) {
    trace("error: " + e.description);
  }
}

function connect() {
  localName = document.getElementById("local").value.toLowerCase();
  server = document.getElementById("server").value.toLowerCase();
  if (localName.length == 0) {
    alert("I need a name please.");
    document.getElementById("local").focus();
  } else {
    document.getElementById("connect").disabled = true;
    document.getElementById("disconnect").disabled = false;
    document.getElementById("send").disabled = false;
    signIn();
  }
}

function disconnect() {
  // 如果和对方在视频通信中，先要给对方发送结束通话的信令
  sendBYE();
  if (request) {
    request.abort();
    request = null;
  }
  if (hangingGet) {
    hangingGet.abort();
    hangingGet = null;
  }
  if (my_id != -1) {
    request = new XMLHttpRequest();
    request.open("GET", server + "/sign_out?peer_id=" + my_id, false);
    request.send();
    request = null;
    my_id = -1;
  }
  document.getElementById("peer_id").value = "";
  document.getElementById('videos').innerHTML = '';
  document.getElementById("connect").disabled = false;
  document.getElementById("disconnect").disabled = true;
  document.getElementById("send").disabled = true;
}

window.onbeforeunload = disconnect;
window.onload = startOnLoad;

function startOnLoad() {
  getLocalAddr();
}

function getLocalAddr() {
  var tmp = document.location.href;
  var url = tmp.substr(0, tmp.length - 1);
  document.getElementById("server").value = url;
}

function passiveStop() {
  trace("Other user ends the call or disconnect." + "\n\n");
  if(is_request_side == 1) {
    if(pc != null) {
      pc.close();
      pc = null;
	}
  } else {
    if(pc_ != null) {
      pc_.close();
      pc_ = null;
	}
  }
  str = "<video id='vid1' muted autoplay></video>";
  SetPreContent(str);
  attachMediaStream(vid1, localstream);
}

function stop() {
  trace("End the call" + "\n\n");
  if(is_request_side == 1) {
    if(pc != null) {
	  pc.close();
      pc = null;
	}
  } else {
    if(pc_ != null) {
	  pc_.close();
      pc_ = null;
	}
  }
  str = "<video id='vid1' muted autoplay></video>";
  SetPreContent(str);
  attachMediaStream(vid1, localstream);
  sendBYE();
}

function sendBYE() {
  var targetPeerId = parseInt(document.getElementById("peer_id").value);
  if (targetPeerId != 0) {
    sendToPeer(targetPeerId, "BYE");
  }
}

function sendToPeer(peer_id, data) {
  if (my_id == -1) {
    alert("Not connected");
    return;
  }
  if (peer_id == my_id) {
    alert("Can't send a message to oneself :)");
    return;
  }
  var r = new XMLHttpRequest();
  r.open("POST", server + "/message?peer_id=" + my_id + "&to=" + peer_id,
         false);
  r.setRequestHeader("Content-Type", "text/plain");
  r.send(data);
  r = null;
}

function send() {
  var text = document.getElementById("message").value;
  var peer_id = parseInt(document.getElementById("peer_id").value);
  if (!text.length || peer_id == 0) {
    alert("No text supplied or invalid peer id");
  } else {
    sendToPeer(peer_id, text);
  }
}

function sendSignal(signal) {
  var peer_id = parseInt(document.getElementById("peer_id").value);
  if (!signal.length || peer_id == 0) {
    alert("No signal supplied or invalid peer id");
  } else {
    sendToPeer(peer_id, signal);
  }
}

function toggleMe(obj) {
  var id = obj.id.replace("toggle", "msg");
  var t = document.getElementById(id);
  if (obj.innerText == "+") {
    obj.innerText = "-";
    t.style.display = "block";
  } else {
    obj.innerText = "+";
    t.style.display = "none";
  }
}
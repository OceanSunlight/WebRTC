#一个简单的webRTC网页音视频通信示例
---
##简介
这是一个使用WebRTC的js api在浏览器进行音视频通信的Demo

##模块介绍
HarryRtcServer.exe是用C++写的本地信令服务器，它的功能包括：中转通信双方的信令，比如SDP、Candidate、为登陆服务器的用户分配一个不重复的身份号、处理用户的网页请求，把服务器端的html和js文件以HTTTP响应数据回传给用户。
communication_server.js主要用于和信令服务器进行通信，使用XHR，向服务器发送请求和解析并分发服务器的HTTP响应。
peerconnection.js主要是封装了WebRTC的RTCPeerConnection和MediaStream的接口，按照WebRTC通信流程进行点对点的媒体流传输。

##使用
1. 在一台电脑上运行信令服务器HarryRtcServer.exe，作为信令服务器；
2. 想要通信的双方，分别在自己的chrome或Firefox浏览器的地址栏中输入步骤1中的服务器IP；
3. 点击Connect按钮登陆服务器，连接上服务器后会提示打开本地摄像头，服务器会分配一个身份号peer_id给你；
4. 根据对方的peer_id，进行呼叫、挂断、发送信息操作。

##功能说明
在线音频、视频、文字聊天，通信信令日志打印

##original_webrtc_client链接
[original_webrtc_client](https://github.com/OceanSunlight/original_webrtc_client)


// Minimal WebRTC Manager for shopping room video calls
class WebRTCManager {
  private peerConnections = new Map()
  private localStream: MediaStream | null = null

  async startLocalStream() {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: { max: 320 }, height: { max: 240 } },
      audio: { echoCancellation: true },
    })
    return this.localStream
  }

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop())
      this.localStream = null
    }
  }

  createPeerConnection(peerId: string, onRemoteStream?: (s: MediaStream) => void) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    })

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream!))
    }

    pc.ontrack = (e) => onRemoteStream?.(e.streams[0])
    this.peerConnections.set(peerId, pc)
    return pc
  }

  async createOffer(peerId: string) {
    const pc = this.peerConnections.get(peerId)
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    return offer
  }

  async createAnswer(peerId: string, offer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(peerId)
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    return answer
  }

  async addAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peerConnections.get(peerId)
    await pc.setRemoteDescription(new RTCSessionDescription(answer))
  }

  async addIceCandidate(peerId: string, candidate: RTCIceCandidate) {
    const pc = this.peerConnections.get(peerId)
    try {
      await pc.addIceCandidate(candidate)
    } catch (e) {
      console.error(e)
    }
  }

  closeAllConnections() {
    this.peerConnections.forEach((pc: RTCPeerConnection) => pc.close())
    this.peerConnections.clear()
  }
}

const webrtcManager = new WebRTCManager()

export { WebRTCManager, webrtcManager }

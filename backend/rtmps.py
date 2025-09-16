import asyncio
import av
from pyrtmp import StreamClosedException
from pyrtmp.messages.audio import AudioMessage
from pyrtmp.messages.command import NSPublish
from pyrtmp.messages.data import MetaDataMessage
from pyrtmp.messages.video import VideoMessage
from pyrtmp.session_manager import SessionManager
from pyrtmp.rtmp import SimpleRTMPController, RTMPProtocol, SimpleRTMPServer
from shared import frame_queue

class StreamController(SimpleRTMPController):
    def __init__(self):
        super().__init__()
        self.codec_context = None

    async def on_ns_publish(self, session: SessionManager, message: NSPublish) -> None:
        # print(f"[rtmp] Publishing stream: {message.publishing_name}")
        try:
            self.codec_context = av.CodecContext.create("h264", "r")
        except Exception as e:
            print(f"[rtmp] Error creating codec context: {e}")
        await super().on_ns_publish(session, message)

    async def on_metadata(self, session: SessionManager, message: MetaDataMessage) -> None:
        print(f"[rtmp] Received metadata: {message.to_dict()}")
        await super().on_metadata(session, message)

    async def on_video_message(self, session: SessionManager, message: VideoMessage) -> None:
        if not self.codec_context:
            return

        try:
            packets = self.codec_context.parse(message.payload)
            for packet in packets:
                if packet.is_corrupt:
                    continue
                frames = self.codec_context.decode(packet)
                for frame in frames:
                    if frame:
                        img = frame.to_ndarray(format="bgr24")
                        if not frame_queue.full():
                            frame_queue.put_nowait(img)
                        else:
                            # print("[rtmp] Frame queue is full, dropping frame.")
                            pass
        except Exception as e:
            # print(f"[rtmp] Error decoding video frame: {e}")
            pass

    async def on_audio_message(self, session: SessionManager, message: AudioMessage) -> None:
        pass

    async def on_stream_closed(self, session: SessionManager, exception: StreamClosedException) -> None:
        print("[rtmp] Stream closed.")
        if self.codec_context:
            self.codec_context.close()
        await super().on_stream_closed(session, exception)


class RTMPServer(SimpleRTMPServer):
    def __init__(self):
        super().__init__()

    async def run(self, host: str = "0.0.0.0", port: int = 1935):
        loop = asyncio.get_event_loop()
        self.server = await loop.create_server(
            lambda: RTMPProtocol(controller=StreamController()),
            host=host,
            port=port,
        )
        print(f"[rtmp] Server listening on {host}:{port}")

async def start_rtmp_server():
    server = RTMPServer()
    await server.run()

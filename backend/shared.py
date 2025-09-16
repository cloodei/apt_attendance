import asyncio

# Shared queue for video frames
frame_queue: asyncio.Queue = asyncio.Queue(maxsize=30)

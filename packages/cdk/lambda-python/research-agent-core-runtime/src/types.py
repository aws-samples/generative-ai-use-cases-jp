"""Type definitions for the research agent core runtime."""

from typing import Any, Dict, List, Optional, Union


# Message types
Message = Dict[str, Any]
ModelInfo = Dict[str, Any]


# Strands event types
class StrandsContentBlockStartEvent:
    def __init__(self, contentBlockIndex: int, start: Dict[str, Any]):
        self.contentBlockIndex = contentBlockIndex
        self.start = start


class StrandsContentBlockDeltaEvent:
    def __init__(self, contentBlockIndex: int, delta: Dict[str, Any]):
        self.contentBlockIndex = contentBlockIndex
        self.delta = delta


class StrandsContentBlockStopEvent:
    def __init__(self, contentBlockIndex: int):
        self.contentBlockIndex = contentBlockIndex


StrandsStreamEvent = Union[
    StrandsContentBlockStartEvent,
    StrandsContentBlockDeltaEvent,
    StrandsContentBlockStopEvent,
    Dict[str, Any],
]

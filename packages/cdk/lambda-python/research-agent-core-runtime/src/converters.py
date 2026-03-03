"""
Claude Agent SDK と Strands Agent 形式の変換ロジック
"""
import json
import logging
from typing import Any, Iterator, Dict

logger = logging.getLogger(__name__)


class ContentBlockConverter:
    """Claude Agent SDK のコンテンツブロックを Strands 形式に変換"""
    
    def __init__(self):
        self.current_block_index = 0
    
    def convert_message_to_events(self, message: Any) -> Iterator[Dict[str, Any]]:
        """
        Claude Agent SDK の Message を Strands イベントストリームに変換
        
        Args:
            message: Claude Agent SDK からの Message オブジェクト
            
        Yields:
            Dict[str, Any]: Strands 形式のイベント
        """
        message_type = type(message).__name__
        
        # 内部メッセージ型（クライアントに送信しない）
        internal_message_types = {"SystemMessage", "ResultMessage"}
        
        if message_type in internal_message_types:
            logger.debug(f"Skipping internal message type: {message_type}")
            return
        
        # AssistantMessage の場合（content 配列を持つ）
        if hasattr(message, "content") and message.content:
            for content_block in message.content:
                yield from self._convert_content_block(content_block)
        
        # 単純な text 属性の場合
        elif hasattr(message, "text") and message.text:
            yield from self._convert_text_block(message.text)
        
        # 未知の型の場合
        else:
            logger.warning(f"Unknown message type: {message_type}")
            try:
                text_repr = str(message)
                if text_repr:
                    yield from self._convert_text_block(f"[Unknown message: {text_repr}]")
            except Exception as e:
                logger.error(f"Failed to convert unknown message: {e}")
    
    def _convert_content_block(self, block: Any) -> Iterator[Dict[str, Any]]:
        """個別のコンテンツブロックを変換"""
        block_type = type(block).__name__
        
        handlers = {
            "TextBlock": lambda b: self._convert_text_block(b.text if hasattr(b, "text") else ""),
            "ThinkingBlock": lambda b: self._convert_thinking_block(b.text if hasattr(b, "text") else ""),
            "ToolUseBlock": lambda b: self._convert_tool_use_block(b),
            "ToolResultBlock": lambda b: self._convert_tool_result_block(b),
        }
        
        if block_type in handlers:
            yield from handlers[block_type](block)
        else:
            logger.warning(f"Unknown content block type: {block_type}")
            # Fallback: try to extract text
            if hasattr(block, "text"):
                yield from self._convert_text_block(block.text)
    
    def _convert_text_block(self, text: str) -> Iterator[Dict[str, Any]]:
        """TextBlock → contentBlockDelta (text)"""
        if not text.endswith('\n'):
            text = text + '\n'
        
        # Send as normal text (chat) - frontend will split by <final_report> tags
        yield {
            "contentBlockDelta": {
                "contentBlockIndex": self.current_block_index,
                "delta": {"text": text}
            }
        }
    
    def _convert_thinking_block(self, text: str) -> Iterator[Dict[str, Any]]:
        """ThinkingBlock → contentBlockDelta (reasoningContent)"""
        yield {
            "contentBlockDelta": {
                "contentBlockIndex": self.current_block_index,
                "delta": {"reasoningContent": {"text": text}}
            }
        }
    
    def _convert_tool_use_block(self, block: Any) -> Iterator[Dict[str, Any]]:
        """ToolUseBlock → contentBlockStart + contentBlockDelta + contentBlockStop"""
        tool_name = getattr(block, "name", "unknown_tool")
        tool_use_id = getattr(block, "id", None) or getattr(block, "toolUseId", f"tool_use_{self.current_block_index}")
        tool_input = getattr(block, "input", {})
        
        # Start
        yield {
            "contentBlockStart": {
                "contentBlockIndex": self.current_block_index,
                "start": {
                    "toolUse": {
                        "name": tool_name,
                        "toolUseId": tool_use_id,
                    }
                }
            }
        }
        
        # Delta
        try:
            input_json = json.dumps(tool_input, ensure_ascii=False) if not isinstance(tool_input, str) else tool_input
            yield {
                "contentBlockDelta": {
                    "contentBlockIndex": self.current_block_index,
                    "delta": {"toolUse": {"input": input_json}}
                }
            }
        except Exception as e:
            logger.error(f"Failed to serialize tool input: {e}")
            yield {
                "contentBlockDelta": {
                    "contentBlockIndex": self.current_block_index,
                    "delta": {"toolUse": {"input": "{}"}}
                }
            }
        
        # Stop
        yield {
            "contentBlockStop": {
                "contentBlockIndex": self.current_block_index
            }
        }
        
        self.current_block_index += 1
    
    def _convert_tool_result_block(self, block: Any) -> Iterator[Dict[str, Any]]:
        """ToolResultBlock → Strands toolResult 形式"""
        try:
            tool_use_id = getattr(block, "toolUseId", None) or getattr(block, "tool_use_id", None)
            status = getattr(block, "status", None)
            content = getattr(block, "content", None)
            
            # content を Strands 形式に変換
            if content is None:
                tool_result_content = [{"text": "(no content)"}]
            elif isinstance(content, list):
                tool_result_content = []
                for item in content:
                    if isinstance(item, dict):
                        tool_result_content.append(item)
                    else:
                        tool_result_content.append({"text": str(item)})
            elif isinstance(content, str):
                tool_result_content = [{"text": content}]
            else:
                tool_result_content = [{"text": str(content)}]
            
            # toolResult オブジェクトを構築
            tool_result = {"content": tool_result_content}
            if tool_use_id:
                tool_result["toolUseId"] = tool_use_id
            if status:
                tool_result["status"] = status
            
            # Start イベント
            yield {
                "contentBlockStart": {
                    "contentBlockIndex": self.current_block_index,
                    "start": {"toolResult": tool_result}
                }
            }
            
            # Stop イベント
            yield {
                "contentBlockStop": {
                    "contentBlockIndex": self.current_block_index
                }
            }
            
            self.current_block_index += 1
            
        except Exception as e:
            logger.error(f"Failed to convert ToolResultBlock: {e}", exc_info=True)
            yield from self._convert_text_block(f"[Tool Result Error]: {str(e)}")

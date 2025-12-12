"""
Strands SDK stream_async イベント観測テスト

pytest -v -s tests/test_stream_events.py を実行して
stream_async が発行するすべてのイベントを観測し、
toolResult がどのような形式で返されるか確認する
"""

import json
import pytest
import boto3
from strands import Agent, tool
from strands.models import BedrockModel


@tool
def add_numbers(a: int, b: int) -> str:
    """2つの数値を足し算する
    
    Args:
        a: 最初の数値
        b: 2番目の数値
    """
    result = a + b
    return f"The sum of {a} and {b} is {result}"


@pytest.fixture
def bedrock_model():
    """Bedrock モデルを作成"""
    session = boto3.Session(region_name="us-east-1")
    return BedrockModel(
        model_id="us.anthropic.claude-sonnet-4-20250514-v1:0",
        boto_session=session
    )


@pytest.mark.asyncio
async def test_stream_async_events_with_tool_use(bedrock_model):
    """
    stream_async のイベントを観測し、toolResult の形式を確認する
    """
    agent = Agent(
        system_prompt="You are a helpful assistant with a calculator tool.",
        model=bedrock_model,
        tools=[add_numbers],
    )
    
    prompt = "Please calculate 5 + 3 using the add_numbers tool"
    
    events = []
    streaming_events = []  # "event" キーを持つイベント
    message_events = []    # "message" キーを持つイベント
    tool_result_events = []
    
    print(f"\n{'='*80}")
    print("Starting stream_async observation")
    print(f"{'='*80}")
    
    async for event in agent.stream_async(prompt):
        events.append(event)
        event_keys = list(event.keys())
        
        print(f"\n[Event #{len(events)}] Keys: {event_keys}")
        
        if "event" in event:
            streaming_events.append(event)
            inner_keys = list(event["event"].keys())
            print(f"  STREAMING EVENT - Inner keys: {inner_keys}")
            # 詳細表示（長すぎる場合は切り詰める）
            content_str = json.dumps(event["event"], indent=2, default=str)
            if len(content_str) > 300:
                content_str = content_str[:300] + "..."
            print(f"  Content: {content_str}")
        
        if "message" in event:
            message_events.append(event)
            msg = event["message"]
            role = msg.get("role")
            print(f"  MESSAGE EVENT - Role: {role}")
            
            for i, content in enumerate(msg.get("content", [])):
                content_keys = list(content.keys())
                print(f"  Content[{i}] keys: {content_keys}")
                
                if "text" in content:
                    text_preview = content["text"][:100] + "..." if len(content["text"]) > 100 else content["text"]
                    print(f"    text: {text_preview}")
                
                if "toolUse" in content:
                    print(f"    toolUse: {content['toolUse']}")
                
                if "toolResult" in content:
                    print(f"  >>> TOOL RESULT FOUND! <<<")
                    tool_result = content["toolResult"]
                    print(f"  toolResult: {json.dumps(tool_result, indent=2, default=str)}")
                    tool_result_events.append(event)
    
    print(f"\n{'='*80}")
    print("Event Summary:")
    print(f"Total events: {len(events)}")
    print(f"Streaming events (with 'event' key): {len(streaming_events)}")
    print(f"Message events (with 'message' key): {len(message_events)}")
    print(f"Tool result events: {len(tool_result_events)}")
    print(f"{'='*80}")
    
    # 検証
    assert len(events) > 0, "イベントが発行されるべき"
    print(f"✓ Total {len(events)} events were emitted")
    
    if len(tool_result_events) == 0:
        print("⚠️  WARNING: No toolResult events found!")
        print("This might be the issue we're trying to debug.")
        
        # ツール関連のイベントを詳しく調べる
        print("\nAnalyzing tool-related events:")
        for i, event in enumerate(message_events):
            msg = event["message"]
            role = msg.get("role")
            print(f"Message Event #{i+1} (role: {role}):")
            for j, content in enumerate(msg.get("content", [])):
                print(f"  Content[{j}]: {list(content.keys())}")
    else:
        print(f"✓ Found {len(tool_result_events)} toolResult events")
    
    return {
        "total_events": len(events),
        "streaming_events": len(streaming_events),
        "message_events": len(message_events),
        "tool_result_events": len(tool_result_events),
        "events": events
    }


@pytest.mark.asyncio
async def test_process_request_streaming_observation(bedrock_model):
    """
    AgentManager.process_request_streaming の出力を観測する
    """
    from src.agent import AgentManager
    from src.types import ModelInfo
    
    agent_manager = AgentManager()
    agent_manager.set_session_info("test-session", "test-trace")
    
    model_info = ModelInfo(
        modelId="us.anthropic.claude-sonnet-4-20250514-v1:0",
        region="us-east-1"
    )
    
    prompt = [{"text": "Please calculate 7 + 2 using available tools"}]
    
    events = []
    
    print(f"\n{'='*80}")
    print("Testing AgentManager.process_request_streaming")
    print(f"{'='*80}")
    
    async for chunk in agent_manager.process_request_streaming(
        messages=[],
        system_prompt="You are a helpful assistant with calculation tools.",
        prompt=prompt,
        model_info=model_info,
        code_execution_enabled=True,  # Enable tools
    ):
        events.append(chunk)
        print(f"[Chunk #{len(events)}] {chunk[:200]}{'...' if len(chunk) > 200 else ''}")
    
    print(f"\n{'='*80}")
    print(f"AgentManager emitted {len(events)} chunks")
    print(f"{'='*80}")
    
    assert len(events) > 0, "AgentManager should emit chunks"
    
    return {
        "total_chunks": len(events),
        "chunks": events
    }

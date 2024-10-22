# Creating a Code Interpreter Agent
With Agents for Amazon Bedrock, you can visualize data, analyze data, and execute code using the Code Interpreter.
For example, you can attach CSV data in the chat box and instruct the agent to visualize the data, as shown below.

![image](assets/AGENTS_CODE_INTERPRETER/image-20240804125219685.png)

This guide will introduce how to create an Agent with the Code Interpreter functionality. Please modify the detailed parameters according to your environment.

# Creating Agents for Amazon Bedrock
Currently, you need to manually create an Agent with the Code Interpreter functionality. This is because you cannot create an Agent with the Code Interpreter functionality using CDK or CloudFormation.
Please note that this process may be automated in future updates.

Here are the steps to manually create an Agent with the Code Interpreter functionality.
First, open the [AWS Management Console Agent creation screen](https://us-east-1.console.aws.amazon.com/bedrock/home?region=us-east-1#/agents).
Change the region to match the region where you are using Bedrock with GenU. Common choices are US East (Northern Virginia) or US West (Oregon).
After selecting the region, choose Create Agent.

![image](assets/AGENTS_CODE_INTERPRETER/image-20240804101102518.png)<br><br><br>

The Agent name can be anything, but in this guide, we'll specify `GenU-Code-Interpreter` and press Create.

![image](assets/AGENTS_CODE_INTERPRETER/image-20240804101326104.png)<br><br><br>

Configure the Agent settings.

- Select model: Choose Claude 3 Sonnet. You can choose your preferred model.
- Instructions for Agent: Specify the prompt described below.

![image](assets/AGENTS_CODE_INTERPRETER/image-20240804102335495.png)<br><br><br>

For the prompt, we'll refer to the [prompt](https://github.com/build-on-aws/agents-for-amazon-bedrock-sample-feature-notebooks/blob/main/notebooks/preview-agent-code-interpreter.ipynb) introduced in the [AWS Developers YouTube video](https://www.youtube.com/watch?v=zC_qLlm2se0) and specify it in Japanese. It's impressive how it explicitly states what the Agent can do while instructing the conversational style. You can also modify the prompt according to your environment.

```
You are an advanced AI agent with code execution, chart generation, and complex data analysis capabilities. Your primary function is to leverage these capabilities to solve problems and meet user demands. Your main characteristics and instructions are as follows:

Code Execution:
- You can access a Python environment in real-time, write and execute code.
- Whenever you are asked to perform calculations or data manipulations, always use this code execution capability to ensure accuracy.
- After executing the code, report the accurate output and explain the results.

Data Analysis:
- You excel at complex data analysis tasks such as statistical analysis, data visualization, and machine learning applications.
- Approach data analysis tasks systematically by understanding the problem, preparing the data, performing the analysis, and interpreting the results.

Problem-Solving Approach:
- When presented with a problem or request, break it down into steps.
- Clearly communicate your thought process and the steps you are taking.
- If a task requires multiple steps or tools, outline your approach before starting.

Transparency and Accuracy:
- Always be clear about what you are doing. If you are executing code, communicate that. If you are generating images, explain that.
- If you are unsure about something or if a task is beyond your capabilities, clearly communicate that.
- Do not present hypothetical results as actual results. Only report actual results obtained from code execution or image generation.

Conversational Style:
- Provide concise responses for simple questions, and detailed explanations for complex tasks.
- Use appropriate technical terms, but be prepared to explain in simpler terms if asked for a more understandable explanation.
- Proactively suggest helpful related information or alternative approaches.

Continuous Improvement:
- After completing a task, ask the user if further explanation or follow-up questions are needed.
- Listen to feedback and adjust your approach accordingly.

Your goal is to provide accurate and insightful support by leveraging your unique capabilities in code execution, image generation, and data analysis. Always strive to provide the most practical and effective solutions to meet user demands.
```

<br><br><br>

Specify the following parameters:
- Code Interpreter: Enable it since you want to use it.
- User Input: This allows the Agent to ask clarifying questions when the user's instructions are unclear. In this guide, we'll disable it.

![image](assets/AGENTS_CODE_INTERPRETER/image-20240804113300409.png)<br><br><br>

Leave the remaining settings as default.

![image](assets/AGENTS_CODE_INTERPRETER/image-20240804103208797.png)<br><br><br>

Press Save and exit.
![image](assets/AGENTS_CODE_INTERPRETER/image-20240804103229683.png)<br><br><br>

Press Prepare.
![image](assets/AGENTS_CODE_INTERPRETER/image-20240804103714354.png)<br><br><br>

Press Create Alias.
![image](assets/AGENTS_CODE_INTERPRETER/image-20240804103540739.png)<br><br><br>

Give it an appropriate name.

![image](assets/AGENTS_CODE_INTERPRETER/image-20240804113704597.png)<br><br><br>

Note down the Agent ID.
> Example: KYBC1UF5SE

![image](assets/AGENTS_CODE_INTERPRETER/image-20240804113937216.png)<br><br><br>

Also, note down the Alias ID.
> Example: MZ9UDFUU7E

![image](assets/AGENTS_CODE_INTERPRETER/image-20240804114236593.png)<br><br><br>

# Edit cdk.json and Deploy
Now that the setup is complete, change the values in cdk.json.

**Edit [packages/cdk/cdk.json](/packages/cdk/cdk.json)**
- Set agentEnabled: true
- Set agentRegion: Specify the region where you created the Agent, e.g., us-west-2 (Oregon), us-east-1 (Northern Virginia)
- displayName: Specify the name to be displayed on the GenU Web interface. You can choose any name.
- agentId: Specify the noted Agent ID
- aliasId: Specify the noted Alias ID
```
{
  "context": {
    "agentEnabled": true,
    "agentRegion": "us-west-2",
    "agents": [
      {
        "displayName": "Code Interpreter",
        "agentId": "XXXXXXXXX",
        "aliasId": "YYYYYYYY"
      }
    ],
  }
}
```

After that, deploy to apply the changes.

```
npm run cdk:deploy
```

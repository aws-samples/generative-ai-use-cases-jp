import { UseCaseInputExample } from 'generative-ai-use-cases-jp';
import { ReactNode } from 'react';
import {
  PiCodeBold,
  PiDetectiveBold,
  PiEnvelopeSimpleBold,
  PiEraserBold,
  PiEyedropperBold,
  PiFlaskBold,
  PiListBulletsBold,
  PiMagnifyingGlassBold,
  PiNotePencilBold,
  PiQuestionBold,
  PiSquaresFourBold,
} from 'react-icons/pi';

export type SamplePromptType = {
  title: string;
  description: string;
  category: string;
  promptTemplate: string;
  inputExamples: UseCaseInputExample[];
  icon: ReactNode;
  color?:
    | 'red'
    | 'green'
    | 'blue'
    | 'purple'
    | 'pink'
    | 'cyan'
    | 'yellow'
    | 'orange'
    | 'gray';
};

export const useCaseBuilderSamplePrompts: SamplePromptType[] = [
  {
    category: 'Content Generation',
    title: 'Text Rewriting',
    description: 'Rewrites text according to given instructions.',
    promptTemplate: `This is a conversation between a user and AI.
When the user provides text enclosed in <text></text> XML tags and instructions enclosed in <instruction></instruction> XML tags, AI should rewrite the text according to the instructions.
Note that the output should only be the rewritten text.
<instruction>
{{text:rewriting instructions}}
</instruction>
<text>
{{text:text to be rewritten}}
</text>`,
    inputExamples: [
      {
        title: 'Detailed Explanation',
        examples: {
          'rewriting instructions': 'Add more detailed explanations',
          'text to be rewritten': `In 1758, Carl Linnaeus, a Swedish botanist and zoologist, published the binomial nomenclature in his work "Systema Naturae". Canis means "dog" in Latin, and he listed domestic dogs, wolves, and jackals under this genus.`,
        },
      },
    ],
    icon: <PiNotePencilBold />,
    color: 'blue',
  },
  {
    category: 'Content Generation',
    title: 'Add Explanations to Bullet Points',
    description: 'Explains key points of content listed in bullet points in detail.',
    promptTemplate: `This is a conversation between a user and AI.
The user provides content enclosed in <content></content> XML tags and bullet points of key features enclosed in <list></list> XML tags.
AI should copy each bullet point exactly as written, then provide detailed explanations.
AI's output should start each bullet point with an asterisk followed by a line break with the corresponding detailed explanation.
<content>
{{text:content}}
</content>
<list>
{{text:key features in bullet points}}
</list>`,
    inputExamples: [
      {
        title: 'TypeScript Features',
        examples: {
          content: 'TypeScript',
          'key features in bullet points': `* Supports static typing
* High compatibility with JavaScript
* Suitable for large-scale development
* Type checking at compile time
* Optional type annotations
* Features like interfaces, generics, and enums
* Supports latest ECMAScript features
* Compiles to pure JavaScript code
* Good integration with editor completion features like VSCode`,
        },
      },
    ],
    icon: <PiListBulletsBold />,
    color: 'blue',
  },
  {
    category: 'Analysis',
    title: 'Text Analysis',
    description: 'Analyzes text based on specified criteria.',
    promptTemplate: `This is a conversation between a user and AI.
When the user provides text enclosed in <text></text> XML tags and analysis criteria enclosed in <criteria></criteria> XML tags, AI should analyze the text based on the specified criteria.
Note that the output should only contain the analysis results.
<criteria>
{{text:analysis criteria}}
</criteria>
<text>
{{text:text to analyze}}
</text>`,
    inputExamples: [
      {
        title: 'Writing Style Analysis',
        examples: {
          'analysis criteria': 'Analyze the writing style, tone, and target audience',
          'text to analyze': `Discover the magic of coding! Our beginner-friendly programming course makes learning to code fun and accessible. With hands-on projects and expert guidance, you'll be building your own apps in no time. Don't let your dreams of becoming a developer stay dreams - start your coding journey today!`,
        },
      },
    ],
    icon: <PiMagnifyingGlassBold />,
    color: 'purple',
  },
  {
    category: 'Analysis',
    title: 'Code Analysis',
    description: 'Analyzes code based on specified criteria.',
    promptTemplate: `This is a conversation between a user and AI.
When the user provides code enclosed in <code></code> XML tags and analysis criteria enclosed in <criteria></criteria> XML tags, AI should analyze the code based on the specified criteria.
Note that the output should only contain the analysis results.
<criteria>
{{text:analysis criteria}}
</criteria>
<code>
{{text:code to analyze}}
</code>`,
    inputExamples: [
      {
        title: 'Code Quality Analysis',
        examples: {
          'analysis criteria': 'Analyze code quality, readability, and potential improvements',
          'code to analyze': `function calculateTotal(items) {
  let t = 0;
  for(let i = 0; i < items.length; i++) {
    if(items[i].price && !items[i].excluded) {
      t = t + items[i].price;
    }
  }
  return t;
}`,
        },
      },
    ],
    icon: <PiCodeBold />,
    color: 'purple',
  },
  {
    category: 'Analysis',
    title: 'Question Generation',
    description: 'Generates questions based on provided content.',
    promptTemplate: `This is a conversation between a user and AI.
When the user provides content enclosed in <content></content> XML tags and instructions enclosed in <instruction></instruction> XML tags, AI should generate questions based on the content according to the instructions.
Note that the output should only contain the generated questions.
<instruction>
{{text:question generation instructions}}
</instruction>
<content>
{{text:content for questions}}
</content>`,
    inputExamples: [
      {
        title: 'Interview Questions',
        examples: {
          'question generation instructions': 'Generate technical interview questions for a senior software engineer position',
          'content for questions': `Required Skills:
- 5+ years of experience in web development
- Proficient in JavaScript/TypeScript and React
- Experience with backend development using Node.js
- Understanding of cloud services (AWS/GCP)
- Knowledge of CI/CD practices
- Experience with microservices architecture`,
        },
      },
    ],
    icon: <PiQuestionBold />,
    color: 'purple',
  },
  {
    category: 'Content Generation',
    title: 'Email Writing',
    description: 'Writes emails based on provided context and instructions.',
    promptTemplate: `This is a conversation between a user and AI.
When the user provides context enclosed in <context></context> XML tags and instructions enclosed in <instruction></instruction> XML tags, AI should write an email based on the context according to the instructions.
Note that the output should only contain the email content.
<instruction>
{{text:email writing instructions}}
</instruction>
<context>
{{text:email context}}
</context>`,
    inputExamples: [
      {
        title: 'Business Email',
        examples: {
          'email writing instructions': 'Write a professional email to schedule a project kickoff meeting',
          'email context': `Project: New E-commerce Website Development
Stakeholders: Development team, design team, and client
Timeline: Project starts next month
Meeting Purpose: Discuss project scope, timeline, and responsibilities
Available Time Slots: Tuesday or Thursday next week, between 10 AM to 2 PM`,
        },
      },
    ],
    icon: <PiEnvelopeSimpleBold />,
    color: 'green',
  },
  {
    category: 'Content Generation',
    title: 'Text Summarization',
    description: 'Summarizes text according to specified requirements.',
    promptTemplate: `This is a conversation between a user and AI.
When the user provides text enclosed in <text></text> XML tags and requirements enclosed in <requirements></requirements> XML tags, AI should create a summary based on the requirements.
Note that the output should only contain the summary.
<requirements>
{{text:summarization requirements}}
</requirements>
<text>
{{text:text to summarize}}
</text>`,
    inputExamples: [
      {
        title: 'Technical Article Summary',
        examples: {
          'summarization requirements': 'Create a concise summary focusing on key technical concepts and findings',
          'text to summarize': `The researchers developed a new machine learning model that combines transformer architecture with reinforcement learning techniques. The model demonstrated significant improvements in natural language understanding tasks, achieving state-of-the-art results on multiple benchmarks. The key innovation lies in its novel attention mechanism that efficiently processes long sequences while maintaining contextual understanding. The model was trained on a diverse dataset of over 100 million examples, and the training process was optimized using distributed computing across multiple GPUs. The results show a 15% improvement in accuracy compared to previous models, while requiring 30% less computational resources.`,
        },
      },
    ],
    icon: <PiEraserBold />,
    color: 'green',
  },
  {
    category: 'Analysis',
    title: 'Pattern Detection',
    description: 'Detects patterns in provided data.',
    promptTemplate: `This is a conversation between a user and AI.
When the user provides data enclosed in <data></data> XML tags and pattern detection criteria enclosed in <criteria></criteria> XML tags, AI should identify patterns based on the criteria.
Note that the output should only contain the detected patterns.
<criteria>
{{text:pattern detection criteria}}
</criteria>
<data>
{{text:data for pattern detection}}
</data>`,
    inputExamples: [
      {
        title: 'User Behavior Analysis',
        examples: {
          'pattern detection criteria': 'Identify common patterns in user behavior and potential trends',
          'data for pattern detection': `User Activity Log:
- User A: Login -> Browse Products -> Add to Cart -> View Cart -> Logout
- User B: Login -> Search Products -> Browse Products -> Add to Cart -> Purchase
- User C: Login -> Browse Products -> Add to Cart -> View Cart -> Purchase
- User D: Login -> Search Products -> Add to Cart -> View Cart -> Remove Item -> Logout
- User E: Login -> Browse Products -> Add to Cart -> Purchase`,
        },
      },
    ],
    icon: <PiDetectiveBold />,
    color: 'orange',
  },
  {
    category: 'Content Generation',
    title: 'Category Classification',
    description: 'Classifies items into categories based on criteria.',
    promptTemplate: `This is a conversation between a user and AI.
When the user provides items enclosed in <items></items> XML tags and classification criteria enclosed in <criteria></criteria> XML tags, AI should classify the items according to the criteria.
Note that the output should only contain the classification results.
<criteria>
{{text:classification criteria}}
</criteria>
<items>
{{text:items to classify}}
</items>`,
    inputExamples: [
      {
        title: 'Product Classification',
        examples: {
          'classification criteria': 'Classify products by category, price range, and target user segment',
          'items to classify': `1. Gaming Laptop - $1,500
2. Wireless Earbuds - $199
3. Smart Watch - $299
4. Professional Camera - $2,000
5. Fitness Tracker - $99
6. Tablet - $599
7. Bluetooth Speaker - $149
8. Desktop PC - $1,200
9. Smartphone - $899
10. External Hard Drive - $129`,
        },
      },
    ],
    icon: <PiSquaresFourBold />,
    color: 'orange',
  },
  {
    category: 'Analysis',
    title: 'Data Extraction',
    description: 'Extracts specific information from text based on criteria.',
    promptTemplate: `This is a conversation between a user and AI.
When the user provides text enclosed in <text></text> XML tags and extraction criteria enclosed in <criteria></criteria> XML tags, AI should extract information according to the criteria.
Note that the output should only contain the extracted information.
<criteria>
{{text:extraction criteria}}
</criteria>
<text>
{{text:text for extraction}}
</text>`,
    inputExamples: [
      {
        title: 'Contact Information Extraction',
        examples: {
          'extraction criteria': 'Extract all contact information (email addresses, phone numbers, addresses)',
          'text for extraction': `Company: Tech Solutions Inc.
Location: 123 Innovation Street, Silicon Valley, CA 94025
Main Office: +1 (555) 123-4567
Support Email: support@techsolutions.com
Sales Department:
- John Smith (Sales Director)
  Email: j.smith@techsolutions.com
  Direct Line: +1 (555) 234-5678
- Sarah Johnson (Account Manager)
  Email: s.johnson@techsolutions.com
  Mobile: +1 (555) 345-6789
Technical Support:
Address: Building B, 456 Tech Park Road, CA 94026
Hours: 24/7
Emergency Contact: +1 (555) 987-6543`,
        },
      },
    ],
    icon: <PiEyedropperBold />,
    color: 'orange',
  },
  {
    category: 'Analysis',
    title: 'Test Case Generation',
    description: 'Generates test cases based on specifications.',
    promptTemplate: `This is a conversation between a user and AI.
When the user provides specifications enclosed in <specs></specs> XML tags and requirements enclosed in <requirements></requirements> XML tags, AI should generate test cases according to the requirements.
Note that the output should only contain the test cases.
<requirements>
{{text:test case requirements}}
</requirements>
<specs>
{{text:specifications}}
</specs>`,
    inputExamples: [
      {
        title: 'API Test Cases',
        examples: {
          'test case requirements': 'Generate test cases for API endpoints including positive and negative scenarios',
          specifications: `User Authentication API:

POST /api/auth/login
Request Body:
- email (string, required)
- password (string, required)

Response:
- 200: Successful login
- 400: Invalid input
- 401: Invalid credentials
- 429: Too many attempts
- 500: Server error

Requirements:
- Email must be valid format
- Password must be 8-20 characters
- Rate limiting: max 5 attempts per minute
- Session timeout: 30 minutes`,
        },
      },
    ],
    icon: <PiFlaskBold />,
    color: 'cyan',
  },
];

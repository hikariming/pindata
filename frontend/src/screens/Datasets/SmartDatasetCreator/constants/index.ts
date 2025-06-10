import { DatasetType, FormatDetail, AIModel } from '../types';

// 静态数据集类型定义（用于类型检查和基础逻辑）
export const DATASET_TYPES: DatasetType[] = [
  {
    id: 'qa-pairs',
    name: 'Q&A Pairs',
    description: 'Question and Answer pairs for conversational AI training',
    icon: '💬',
    formats: ['Alpaca', 'ShareGPT', 'OpenAI'],
    multimodal: true,
    category: 'supervised',
    useCase: 'Conversational AI, Customer Service',
    example: 'User questions with detailed answers'
  },
  {
    id: 'instruction-tuning',
    name: 'Instruction Tuning',
    description: 'Task instructions with examples for model fine-tuning',
    icon: '📝',
    formats: ['Alpaca', 'ShareGPT'],
    multimodal: true,
    category: 'supervised',
    useCase: 'Task-specific AI, Assistant Training',
    example: 'Task instructions with input/output examples'
  },
  {
    id: 'text-classification',
    name: 'Text Classification',
    description: 'Text samples with category labels for classification tasks',
    icon: '🏷️',
    formats: ['Alpaca', 'CSV'],
    multimodal: false,
    category: 'supervised',
    useCase: 'Content Categorization, Sentiment Analysis',
    example: 'Text samples with category labels'
  },
  {
    id: 'dialogue',
    name: 'Dialogue',
    description: 'Multi-turn conversations for dialogue systems',
    icon: '💭',
    formats: ['ShareGPT', 'OpenAI'],
    multimodal: true,
    category: 'supervised',
    useCase: 'Chat Systems, Virtual Assistants',
    example: 'Multi-turn conversation flows'
  },
  {
    id: 'domain-adaptation',
    name: 'Domain Adaptation',
    description: 'Domain-specific data for specialized model training',
    icon: '🎯',
    formats: ['Alpaca', 'ShareGPT'],
    multimodal: true,
    category: 'supervised',
    useCase: 'Domain-specific AI, Professional Applications',
    example: 'Specialized domain knowledge and tasks'
  },
  {
    id: 'reasoning',
    name: 'Reasoning',
    description: 'Logic and reasoning tasks with step-by-step solutions',
    icon: '🧮',
    formats: ['Alpaca-COT', 'ShareGPT'],
    multimodal: false,
    category: 'reasoning',
    useCase: 'Logical Reasoning, Problem Solving',
    example: 'Step-by-step reasoning processes'
  },
  {
    id: 'knowledge-distillation',
    name: 'Knowledge Distillation',
    description: 'Knowledge transfer data for model compression',
    icon: '⚗️',
    formats: ['Alpaca', 'ShareGPT'],
    multimodal: true,
    category: 'distillation',
    useCase: 'Model Compression, Knowledge Transfer',
    example: 'Teacher-student learning examples'
  }
];

// 支持国际化的数据集类型定义
export const getDatasetTypes = (t: (key: string) => string): DatasetType[] => [
  {
    id: 'qa-pairs',
    name: t('smartDatasetCreator.constants.datasetTypes.qaPairs.name'),
    description: t('smartDatasetCreator.constants.datasetTypes.qaPairs.description'),
    icon: '💬',
    formats: ['Alpaca', 'ShareGPT', 'OpenAI'],
    multimodal: true,
    category: 'supervised',
    useCase: t('smartDatasetCreator.constants.datasetTypes.qaPairs.useCase'),
    example: t('smartDatasetCreator.constants.datasetTypes.qaPairs.example')
  },
  {
    id: 'instruction-tuning',
    name: t('smartDatasetCreator.constants.datasetTypes.instructionTuning.name'),
    description: t('smartDatasetCreator.constants.datasetTypes.instructionTuning.description'),
    icon: '📝',
    formats: ['Alpaca', 'ShareGPT'],
    multimodal: true,
    category: 'supervised',
    useCase: t('smartDatasetCreator.constants.datasetTypes.instructionTuning.useCase'),
    example: t('smartDatasetCreator.constants.datasetTypes.instructionTuning.example')
  },
  {
    id: 'text-classification',
    name: t('smartDatasetCreator.constants.datasetTypes.textClassification.name'),
    description: t('smartDatasetCreator.constants.datasetTypes.textClassification.description'),
    icon: '🏷️',
    formats: ['Alpaca', 'CSV'],
    multimodal: false,
    category: 'supervised',
    useCase: t('smartDatasetCreator.constants.datasetTypes.textClassification.useCase'),
    example: t('smartDatasetCreator.constants.datasetTypes.textClassification.example')
  },
  {
    id: 'dialogue',
    name: t('smartDatasetCreator.constants.datasetTypes.dialogue.name'),
    description: t('smartDatasetCreator.constants.datasetTypes.dialogue.description'),
    icon: '💭',
    formats: ['ShareGPT', 'OpenAI'],
    multimodal: true,
    category: 'supervised',
    useCase: t('smartDatasetCreator.constants.datasetTypes.dialogue.useCase'),
    example: t('smartDatasetCreator.constants.datasetTypes.dialogue.example')
  },
  {
    id: 'domain-adaptation',
    name: t('smartDatasetCreator.constants.datasetTypes.domainAdaptation.name'),
    description: t('smartDatasetCreator.constants.datasetTypes.domainAdaptation.description'),
    icon: '🎯',
    formats: ['Alpaca', 'ShareGPT'],
    multimodal: true,
    category: 'supervised',
    useCase: t('smartDatasetCreator.constants.datasetTypes.domainAdaptation.useCase'),
    example: t('smartDatasetCreator.constants.datasetTypes.domainAdaptation.example')
  },
  {
    id: 'reasoning',
    name: t('smartDatasetCreator.constants.datasetTypes.reasoning.name'),
    description: t('smartDatasetCreator.constants.datasetTypes.reasoning.description'),
    icon: '🧮',
    formats: ['Alpaca-COT', 'ShareGPT'],
    multimodal: false,
    category: 'reasoning',
    useCase: t('smartDatasetCreator.constants.datasetTypes.reasoning.useCase'),
    example: t('smartDatasetCreator.constants.datasetTypes.reasoning.example')
  },
  {
    id: 'knowledge-distillation',
    name: t('smartDatasetCreator.constants.datasetTypes.knowledgeDistillation.name'),
    description: t('smartDatasetCreator.constants.datasetTypes.knowledgeDistillation.description'),
    icon: '⚗️',
    formats: ['Alpaca', 'ShareGPT'],
    multimodal: true,
    category: 'distillation',
    useCase: t('smartDatasetCreator.constants.datasetTypes.knowledgeDistillation.useCase'),
    example: t('smartDatasetCreator.constants.datasetTypes.knowledgeDistillation.example')
  }
];

// 静态格式详细说明（用于类型检查和基础逻辑）
export const FORMAT_DETAILS: Record<string, FormatDetail> = {
  'Alpaca': {
    name: 'Alpaca Format',
    description: 'Simple instruction-based format inspired by Stanford Alpaca',
    structure: 'JSON with instruction, input, output fields',
    advantages: [
      'Simple and clean structure',
      'Widely supported',
      'Easy to understand'
    ],
    disadvantages: [
      'Limited conversation context',
      'No multi-turn support'
    ],
    bestFor: [
      'Single-turn instructions',
      'Task-specific training',
      'Simple Q&A pairs'
    ],
    example: '{"instruction": "Task description", "input": "Input data", "output": "Expected output"}'
  },
  'ShareGPT': {
    name: 'ShareGPT Format',
    description: 'Multi-turn conversation format from ShareGPT',
    structure: 'JSON with conversations array containing role and content',
    advantages: [
      'Multi-turn conversation support',
      'Rich dialogue context',
      'Natural conversation flow'
    ],
    disadvantages: [
      'More complex structure',
      'Larger file sizes'
    ],
    bestFor: [
      'Dialogue systems',
      'Conversational AI',
      'Multi-turn interactions'
    ],
    example: '{"conversations": [{"from": "human", "value": "Question"}, {"from": "gpt", "value": "Answer"}]}'
  },
  'OpenAI': {
    name: 'OpenAI Format',
    description: 'OpenAI fine-tuning format for chat completions',
    structure: 'JSONL with messages array containing role and content',
    advantages: [
      'Native OpenAI support',
      'Optimized for GPT models',
      'System message support'
    ],
    disadvantages: [
      'Vendor-specific format',
      'Limited to OpenAI ecosystem'
    ],
    bestFor: [
      'OpenAI model fine-tuning',
      'GPT-based applications',
      'System-guided conversations'
    ],
    example: '{"messages": [{"role": "system", "content": "System prompt"}, {"role": "user", "content": "User message"}]}'
  },
  'Alpaca-COT': {
    name: 'Alpaca Chain-of-Thought',
    description: 'Extended Alpaca format with reasoning steps',
    structure: 'JSON with instruction, input, reasoning, output fields',
    advantages: [
      'Explicit reasoning steps',
      'Better for complex tasks',
      'Improved model understanding'
    ],
    disadvantages: [
      'More complex to create',
      'Requires reasoning annotation'
    ],
    bestFor: [
      'Mathematical reasoning',
      'Step-by-step solutions',
      'Logic problems'
    ],
    example: '{"instruction": "Solve", "input": "Problem", "reasoning": "Step-by-step", "output": "Solution"}'
  },
  'CSV': {
    name: 'CSV Format',
    description: 'Comma-separated values for simple tabular data',
    structure: 'CSV with columns for text and labels',
    advantages: [
      'Simple tabular format',
      'Easy to process',
      'Universal support'
    ],
    disadvantages: [
      'Limited for complex data',
      'No nested structures'
    ],
    bestFor: [
      'Text classification',
      'Simple labeling tasks',
      'Tabular datasets'
    ],
    example: '"text","label"\n"Sample text","category"'
  }
};

// 支持国际化的数据格式详细说明
export const getFormatDetails = (t: (key: string) => string): Record<string, FormatDetail> => ({
  'Alpaca': {
    name: t('smartDatasetCreator.constants.formatDetails.alpaca.name'),
    description: t('smartDatasetCreator.constants.formatDetails.alpaca.description'),
    structure: t('smartDatasetCreator.constants.formatDetails.alpaca.structure'),
    advantages: [
      t('smartDatasetCreator.constants.formatDetails.alpaca.advantages.0'),
      t('smartDatasetCreator.constants.formatDetails.alpaca.advantages.1'),
      t('smartDatasetCreator.constants.formatDetails.alpaca.advantages.2')
    ],
    disadvantages: [
      t('smartDatasetCreator.constants.formatDetails.alpaca.disadvantages.0'),
      t('smartDatasetCreator.constants.formatDetails.alpaca.disadvantages.1')
    ],
    bestFor: [
      t('smartDatasetCreator.constants.formatDetails.alpaca.bestFor.0'),
      t('smartDatasetCreator.constants.formatDetails.alpaca.bestFor.1'),
      t('smartDatasetCreator.constants.formatDetails.alpaca.bestFor.2')
    ],
    example: t('smartDatasetCreator.constants.formatDetails.alpaca.example')
  },
  'ShareGPT': {
    name: t('smartDatasetCreator.constants.formatDetails.shareGPT.name'),
    description: t('smartDatasetCreator.constants.formatDetails.shareGPT.description'),
    structure: t('smartDatasetCreator.constants.formatDetails.shareGPT.structure'),
    advantages: [
      t('smartDatasetCreator.constants.formatDetails.shareGPT.advantages.0'),
      t('smartDatasetCreator.constants.formatDetails.shareGPT.advantages.1'),
      t('smartDatasetCreator.constants.formatDetails.shareGPT.advantages.2')
    ],
    disadvantages: [
      t('smartDatasetCreator.constants.formatDetails.shareGPT.disadvantages.0'),
      t('smartDatasetCreator.constants.formatDetails.shareGPT.disadvantages.1')
    ],
    bestFor: [
      t('smartDatasetCreator.constants.formatDetails.shareGPT.bestFor.0'),
      t('smartDatasetCreator.constants.formatDetails.shareGPT.bestFor.1'),
      t('smartDatasetCreator.constants.formatDetails.shareGPT.bestFor.2')
    ],
    example: t('smartDatasetCreator.constants.formatDetails.shareGPT.example')
  },
  'OpenAI': {
    name: t('smartDatasetCreator.constants.formatDetails.openAI.name'),
    description: t('smartDatasetCreator.constants.formatDetails.openAI.description'),
    structure: t('smartDatasetCreator.constants.formatDetails.openAI.structure'),
    advantages: [
      t('smartDatasetCreator.constants.formatDetails.openAI.advantages.0'),
      t('smartDatasetCreator.constants.formatDetails.openAI.advantages.1'),
      t('smartDatasetCreator.constants.formatDetails.openAI.advantages.2')
    ],
    disadvantages: [
      t('smartDatasetCreator.constants.formatDetails.openAI.disadvantages.0'),
      t('smartDatasetCreator.constants.formatDetails.openAI.disadvantages.1')
    ],
    bestFor: [
      t('smartDatasetCreator.constants.formatDetails.openAI.bestFor.0'),
      t('smartDatasetCreator.constants.formatDetails.openAI.bestFor.1'),
      t('smartDatasetCreator.constants.formatDetails.openAI.bestFor.2')
    ],
    example: t('smartDatasetCreator.constants.formatDetails.openAI.example')
  },
  'Alpaca-COT': {
    name: t('smartDatasetCreator.constants.formatDetails.alpacaCOT.name'),
    description: t('smartDatasetCreator.constants.formatDetails.alpacaCOT.description'),
    structure: t('smartDatasetCreator.constants.formatDetails.alpacaCOT.structure'),
    advantages: [
      t('smartDatasetCreator.constants.formatDetails.alpacaCOT.advantages.0'),
      t('smartDatasetCreator.constants.formatDetails.alpacaCOT.advantages.1'),
      t('smartDatasetCreator.constants.formatDetails.alpacaCOT.advantages.2')
    ],
    disadvantages: [
      t('smartDatasetCreator.constants.formatDetails.alpacaCOT.disadvantages.0'),
      t('smartDatasetCreator.constants.formatDetails.alpacaCOT.disadvantages.1')
    ],
    bestFor: [
      t('smartDatasetCreator.constants.formatDetails.alpacaCOT.bestFor.0'),
      t('smartDatasetCreator.constants.formatDetails.alpacaCOT.bestFor.1'),
      t('smartDatasetCreator.constants.formatDetails.alpacaCOT.bestFor.2')
    ],
    example: t('smartDatasetCreator.constants.formatDetails.alpacaCOT.example')
  },
  'CSV': {
    name: t('smartDatasetCreator.constants.formatDetails.csv.name'),
    description: t('smartDatasetCreator.constants.formatDetails.csv.description'),
    structure: t('smartDatasetCreator.constants.formatDetails.csv.structure'),
    advantages: [
      t('smartDatasetCreator.constants.formatDetails.csv.advantages.0'),
      t('smartDatasetCreator.constants.formatDetails.csv.advantages.1'),
      t('smartDatasetCreator.constants.formatDetails.csv.advantages.2')
    ],
    disadvantages: [
      t('smartDatasetCreator.constants.formatDetails.csv.disadvantages.0'),
      t('smartDatasetCreator.constants.formatDetails.csv.disadvantages.1')
    ],
    bestFor: [
      t('smartDatasetCreator.constants.formatDetails.csv.bestFor.0'),
      t('smartDatasetCreator.constants.formatDetails.csv.bestFor.1'),
      t('smartDatasetCreator.constants.formatDetails.csv.bestFor.2')
    ],
    example: t('smartDatasetCreator.constants.formatDetails.csv.example')
  }
});

// 静态AI模型配置选项
export const AI_MODELS: AIModel[] = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', quality: 'high', speed: 'medium' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', quality: 'medium', speed: 'fast' },
  { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic', quality: 'high', speed: 'medium' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', quality: 'medium', speed: 'fast' },
  { id: 'local-llm', name: 'Local LLM', provider: 'Local', quality: 'custom', speed: 'variable' }
];

// 支持国际化的模型配置选项
export const getAIModels = (t: (key: string) => string): AIModel[] => [
  { id: 'gpt-4', name: t('smartDatasetCreator.constants.aiModels.gpt4'), provider: 'OpenAI', quality: 'high', speed: 'medium' },
  { id: 'gpt-3.5-turbo', name: t('smartDatasetCreator.constants.aiModels.gpt35Turbo'), provider: 'OpenAI', quality: 'medium', speed: 'fast' },
  { id: 'claude-3', name: t('smartDatasetCreator.constants.aiModels.claude3'), provider: 'Anthropic', quality: 'high', speed: 'medium' },
  { id: 'gemini-pro', name: t('smartDatasetCreator.constants.aiModels.geminiPro'), provider: 'Google', quality: 'medium', speed: 'fast' },
  { id: 'local-llm', name: t('smartDatasetCreator.constants.aiModels.localLlm'), provider: 'Local', quality: 'custom', speed: 'variable' }
];

// 静态步骤配置（用于类型检查和基础逻辑）
export const STEPS = [
  { id: 1, name: 'Select Data', description: 'Choose files and collections for dataset creation' },
  { id: 2, name: 'Configure Dataset', description: 'Set dataset type, format and basic information' },
  { id: 3, name: 'Configure Model', description: 'Choose AI model and processing parameters' },
  { id: 4, name: 'Preview & Confirm', description: 'Review settings and preview generated prompt' },
  { id: 5, name: 'Generate Dataset', description: 'Process files and generate the dataset' }
];

// 支持国际化的步骤配置
export const getSteps = (t: (key: string) => string) => [
  { id: 1, name: t('smartDatasetCreator.constants.steps.selectData.name'), description: t('smartDatasetCreator.constants.steps.selectData.description') },
  { id: 2, name: t('smartDatasetCreator.constants.steps.configDataset.name'), description: t('smartDatasetCreator.constants.steps.configDataset.description') },
  { id: 3, name: t('smartDatasetCreator.constants.steps.configModel.name'), description: t('smartDatasetCreator.constants.steps.configModel.description') },
  { id: 4, name: t('smartDatasetCreator.constants.steps.previewConfirm.name'), description: t('smartDatasetCreator.constants.steps.previewConfirm.description') },
  { id: 5, name: t('smartDatasetCreator.constants.steps.generateDataset.name'), description: t('smartDatasetCreator.constants.steps.generateDataset.description') }
]; 
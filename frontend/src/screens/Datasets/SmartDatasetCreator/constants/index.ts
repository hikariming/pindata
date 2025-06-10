import { DatasetType, FormatDetail, AIModel } from '../types';

// 数据集类型定义
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

// 数据格式详细说明
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

// 模型配置选项
export const getAIModels = (t: (key: string) => string): AIModel[] => [
  { id: 'gpt-4', name: t('smartDatasetCreator.constants.aiModels.gpt4'), provider: 'OpenAI', quality: 'high', speed: 'medium' },
  { id: 'gpt-3.5-turbo', name: t('smartDatasetCreator.constants.aiModels.gpt35Turbo'), provider: 'OpenAI', quality: 'medium', speed: 'fast' },
  { id: 'claude-3', name: t('smartDatasetCreator.constants.aiModels.claude3'), provider: 'Anthropic', quality: 'high', speed: 'medium' },
  { id: 'gemini-pro', name: t('smartDatasetCreator.constants.aiModels.geminiPro'), provider: 'Google', quality: 'medium', speed: 'fast' },
  { id: 'local-llm', name: t('smartDatasetCreator.constants.aiModels.localLlm'), provider: 'Local', quality: 'custom', speed: 'variable' }
];

// 步骤配置
export const getSteps = (t: (key: string) => string) => [
  { id: 1, name: t('smartDatasetCreator.constants.steps.selectData.name'), description: t('smartDatasetCreator.constants.steps.selectData.description') },
  { id: 2, name: t('smartDatasetCreator.constants.steps.configDataset.name'), description: t('smartDatasetCreator.constants.steps.configDataset.description') },
  { id: 3, name: t('smartDatasetCreator.constants.steps.configModel.name'), description: t('smartDatasetCreator.constants.steps.configModel.description') },
  { id: 4, name: t('smartDatasetCreator.constants.steps.previewConfirm.name'), description: t('smartDatasetCreator.constants.steps.previewConfirm.description') },
  { id: 5, name: t('smartDatasetCreator.constants.steps.generateDataset.name'), description: t('smartDatasetCreator.constants.steps.generateDataset.description') }
]; 
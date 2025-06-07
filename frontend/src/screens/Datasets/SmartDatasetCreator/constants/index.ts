import { DatasetType, FormatDetail, AIModel } from '../types';

// 数据集类型定义
export const DATASET_TYPES: DatasetType[] = [
  {
    id: 'qa-pairs',
    name: '问答对 (QA Pairs)',
    description: '从文档内容生成问题和答案对，适用于问答系统训练',
    icon: '💬',
    formats: ['Alpaca', 'ShareGPT', 'OpenAI'],
    multimodal: true,
    category: 'supervised',
    useCase: '智能客服、知识问答、教育辅导',
    example: '{"instruction": "什么是人工智能？", "input": "", "output": "人工智能是一门计算机科学..."}'
  },
  {
    id: 'instruction-tuning',
    name: '指令微调 (Instruction Tuning)',
    description: '生成指令-输入-输出三元组，用于指令遵循模型训练',
    icon: '📝',
    formats: ['Alpaca', 'ShareGPT'],
    multimodal: true,
    category: 'supervised',
    useCase: '智能办公、文档处理、个性化助手',
    example: '{"instruction": "将以下文本翻译成英文", "input": "你好世界", "output": "Hello World"}'
  },
  {
    id: 'text-classification',
    name: '文本分类',
    description: '提取文档片段并生成分类标签，用于情感分析、内容审核等',
    icon: '🏷️',
    formats: ['Alpaca', 'CSV'],
    multimodal: false,
    category: 'supervised',
    useCase: '情感分析、内容审核、新闻分类、意图识别',
    example: '{"text": "这个产品很棒！", "label": "positive"}'
  },
  {
    id: 'dialogue',
    name: '对话微调',
    description: '生成多轮对话数据，提升对话连贯性和上下文理解',
    icon: '💭',
    formats: ['ShareGPT', 'OpenAI'],
    multimodal: true,
    category: 'supervised',
    useCase: '智能客服、聊天机器人、语音助手',
    example: '{"conversations": [{"role": "user", "content": "你好"}, {"role": "assistant", "content": "您好！有什么可以帮助您的吗？"}]}'
  },
  {
    id: 'domain-adaptation',
    name: '领域适配',
    description: '特定领域的知识微调，提升模型在专业领域的表现',
    icon: '🎯',
    formats: ['Alpaca', 'ShareGPT'],
    multimodal: true,
    category: 'supervised',
    useCase: '医疗诊断、法律咨询、金融分析',
    example: '{"instruction": "分析患者症状", "input": "患者胸痛3小时", "output": "建议进行心电图检查...", "domain": "医疗"}'
  },
  {
    id: 'reasoning',
    name: '推理微调',
    description: '包含思维链的推理数据，训练模型逻辑推理能力',
    icon: '🧮',
    formats: ['Alpaca-COT', 'ShareGPT'],
    multimodal: false,
    category: 'reasoning',
    useCase: '数学解题、代码生成、逻辑推理、复杂分析',
    example: '{"instruction": "解数学题", "input": "3×5+2=?", "chain_of_thought": "先算乘法：3×5=15，再加2：15+2=17", "output": "17"}'
  },
  {
    id: 'knowledge-distillation',
    name: '知识蒸馏',
    description: '从大模型提取知识训练小模型，平衡性能与成本',
    icon: '⚗️',
    formats: ['Alpaca', 'ShareGPT'],
    multimodal: true,
    category: 'distillation',
    useCase: '模型压缩、边缘部署、成本优化',
    example: '基于GPT-4输出生成的训练数据，用于训练更小的模型'
  }
];

// 数据格式详细说明
export const FORMAT_DETAILS: Record<string, FormatDetail> = {
  'Alpaca': {
    name: 'Alpaca 格式',
    description: '斯坦福大学发布的经典指令微调格式，结构简洁，适合单轮任务',
    structure: 'instruction + input + output',
    advantages: ['结构简洁', '任务导向清晰', '社区支持广泛'],
    disadvantages: ['多轮对话需手动拼接', '缺乏工具调用支持'],
    bestFor: ['指令微调', '问答系统', '文本生成'],
    example: `{
  "instruction": "将下面的中文翻译成英文",
  "input": "你好，世界！",
  "output": "Hello, World!"
}`
  },
  'ShareGPT': {
    name: 'ShareGPT 格式', 
    description: '支持多轮对话和工具调用的格式，更接近真实交互场景',
    structure: 'conversations + tools + roles',
    advantages: ['支持多轮对话', '工具调用能力', '角色管理'],
    disadvantages: ['格式较复杂', '需遵循角色位置规则'],
    bestFor: ['对话系统', '工具调用', '多模态交互'],
    example: `{
  "conversations": [
    {"role": "user", "content": "今天天气怎么样？"},
    {"role": "assistant", "content": "我来帮您查询天气..."}
  ]
}`
  },
  'OpenAI': {
    name: 'OpenAI 格式',
    description: 'OpenAI API兼容格式，ShareGPT的简化版本',
    structure: 'messages + roles',
    advantages: ['API兼容', '简单易用', '广泛支持'],
    disadvantages: ['功能相对简单', '扩展性有限'],
    bestFor: ['API集成', '简单对话', '快速原型'],
    example: `{
  "messages": [
    {"role": "system", "content": "你是一个有用的助手"},
    {"role": "user", "content": "请介绍一下AI"},
    {"role": "assistant", "content": "AI是人工智能的缩写..."}
  ]
}`
  },
  'Alpaca-COT': {
    name: 'Alpaca-COT 格式',
    description: '带思维链的Alpaca格式，适用于推理任务训练',
    structure: 'instruction + input + chain_of_thought + output',
    advantages: ['支持推理过程', '逻辑清晰', '教学效果好'],
    disadvantages: ['数据构造复杂', '需要专业标注'],
    bestFor: ['数学推理', '逻辑分析', '步骤分解'],
    example: `{
  "instruction": "解这个数学题",
  "input": "如果一个正方形的边长是5cm，求面积",
  "chain_of_thought": "正方形面积公式是边长的平方，所以面积 = 5 × 5 = 25",
  "output": "25平方厘米"
}`
  },
  'CSV': {
    name: 'CSV 格式',
    description: '简单的表格格式，适合分类和标注任务',
    structure: 'text, label',
    advantages: ['简单直观', '易于编辑', '工具支持多'],
    disadvantages: ['功能有限', '不支持复杂结构'],
    bestFor: ['文本分类', '标签标注', '简单任务'],
    example: `text,label
"这个产品很好用",positive
"服务态度差",negative`
  }
};

// 模型配置选项
export const AI_MODELS: AIModel[] = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI', quality: 'high', speed: 'medium' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI', quality: 'medium', speed: 'fast' },
  { id: 'claude-3', name: 'Claude-3', provider: 'Anthropic', quality: 'high', speed: 'medium' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', quality: 'medium', speed: 'fast' },
  { id: 'local-llm', name: '本地模型', provider: 'Local', quality: 'custom', speed: 'variable' }
];

// 步骤配置
export const STEPS = [
  { id: 1, name: '选择数据', description: '从原始数据中选择文件' },
  { id: 2, name: '配置数据集', description: '选择数据集类型和格式' },
  { id: 3, name: '配置模型', description: '配置AI模型和处理参数' },
  { id: 4, name: '预览确认', description: '预览生成设置并确认' },
  { id: 5, name: '生成数据集', description: 'AI处理并生成数据集' }
]; 
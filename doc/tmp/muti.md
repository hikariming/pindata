 Read 1493 lines (ctrl+r to expand)

⏺ 基于对你的代码架构分析，我来详细回答你的需求分析：

  当前架构分析

  1. 原始数据支持情况

  ✅ 已经支持图片和视频上传
  - RawData模型已经包含图片和视频的FileType枚举
  - 支持的图片格式：JPG, PNG, GIF, BMP, SVG, WEBP
  - 支持的视频格式：MP4, AVI, MOV, WMV, FLV, WEBM
  - 模型包含图片/视频特定字段（尺寸、时长、编码等）

  2. 数据治理架构

  ✅ 治理框架已搭建
  - DataGovernanceProject：治理项目管理
  - GovernedData：治理后数据存储，支持标签、分类、质量评分
  - KnowledgeItem：知识管理系统
  - 前端有完整的数据治理界面

  3. 需要实现的功能

  实现方案

  阶段1：扩展数据治理模型支持多媒体标注
  ⎿  ☐ 扩展GovernedData模型支持多媒体标注和问答数据结构
     ☐ 创建多媒体标注API端点，支持图片问答、视频字幕等标注
     ☐ 实现AI辅助标注服务，集成视觉和语言模型
     ☐ 开发前端多媒体标注界面，支持手工和AI辅助标注
     ☐ 在治理后数据展示中整合多媒体标注结果

⏺ 核心改进建议：

  1. 数据模型扩展
  需要在GovernedData模型中添加多媒体标注字段：
  # 在governed_data.py中添加
  annotation_data = Column(JSON)  # 存储标注数据
  annotation_type = Column(String(50))  # 标注类型：qa, caption, transcript等
  ai_annotations = Column(JSON)  # AI生成的标注
  human_annotations = Column(JSON)  # 人工标注
  annotation_confidence = Column(Float)  # 标注置信度

  2. 新增多媒体标注API
  创建专门的标注端点：
  - /api/v1/annotations/image-qa - 图片问答标注
  - /api/v1/annotations/video-transcript - 视频字幕标注
  - /api/v1/annotations/ai-assist - AI辅助标注

  3. AI服务集成
  集成视觉和语言模型：
  - 图片理解：GPT-4V, Claude 3 Vision
  - 视频处理：Whisper（语音转文字）+ 视觉模型
  - 标注质量评估：基于置信度的自动质检

  4. 前端标注界面
  在/governance/projects/{id}的治理后数据标签页中：
  - 图片标注器：支持区域选择+问答
  - 视频标注器：时间轴+字幕编辑
  - AI建议面板：显示AI生成的标注建议

  5. 工作流程设计
  原始图片/视频 → AI预标注 → 人工审核修正 → 质量评估 → 治理后数据展示

  优势

  1. 无需重构：现有架构已支持多媒体文件和数据治理
  2. 渐进实现：可按优先级逐步添加功能
  3. 数据统一：所有标注数据通过GovernedData统一管理
  4. AI+人工：结合自动化和人工质控

  下一步建议

  1. 先实现图片问答标注功能作为MVP
  2. 再扩展到视频字幕标注
  3. 最后完善AI辅助和质量评估

  你希望我开始实现哪个部分？我建议从扩展数据模型开始。

# DataFlow 纯文本流水线集成计划

## 1. 项目概述

### 1.1 当前架构分析

**前端RawData功能**：
- 完整的文件库(Library)管理系统
- 支持文档、图片、视频等多种文件类型
- 文件上传、预览、转换功能
- 文件状态跟踪和统计展示
- 支持批量操作和文件筛选

**后端服务架构**：
- `LibraryService`: 文件库管理
- `ConversionService`: 文件转换服务
- `DatasetService`: 数据集管理
- `EnhancedDatasetService`: 增强数据集服务
- 完整的REST API支持

**数据集功能**：
- 智能数据集创建器(SmartDatasetCreator)
- 支持多种数据集类型(QA pairs, instruction tuning等)
- 版本控制、预览、导出功能
- 任务监控和进度跟踪

### 1.2 DataFlow流水线能力

**四大核心流水线**：
1. **预训练数据过滤流水线**：去重、改写、质量过滤
2. **预训练类phi-4数据合成流水线**：QA对话形式数据合成
3. **SFT数据过滤流水线**：监督微调数据质量过滤
4. **SFT数据合成流水线**：从预训练文本合成SFT数据

## 2. 整合方案设计

### 2.1 整合架构图

```
前端界面层
├── RawData管理 (文件库管理)
│   ├── 文件上传与预览
│   ├── 文件转换(Markdown)
│   └── 批量操作
├── 数据集管理 (Dataset功能)
│   ├── 智能数据集创建
│   ├── 数据集预览
│   └── 版本控制
└── 流水线管理 (新增)
    ├── 预训练数据过滤
    ├── 预训练数据合成
    ├── SFT数据过滤
    └── SFT数据合成

后端服务层
├── 现有服务
│   ├── LibraryService
│   ├── ConversionService
│   ├── DatasetService
│   └── EnhancedDatasetService
├── DataFlow集成层 (扩展)
│   ├── DataFlowIntegration
│   ├── PipelineService
│   └── QualityFilterService
└── 任务调度层
    ├── Celery任务队列
    ├── 进度跟踪
    └── 结果存储

数据流转层
├── 文件存储 (MinIO)
├── 任务队列 (Redis)
├── 数据库 (PostgreSQL)
└── DataFlow运行时
```

### 2.2 数据流程设计

**基本流程**：
```
原始文件 → 文件库管理 → 数据预处理 → DataFlow流水线 → 高质量数据集 → 导出使用
```

**详细流程**：
1. **数据输入**：通过RawData界面上传文档、文本文件
2. **预处理**：转换为Markdown格式，建立文件索引
3. **流水线选择**：根据数据类型和需求选择合适的流水线
4. **批量处理**：支持单文件、多文件、整个文件库的批量处理
5. **质量控制**：实时监控处理进度和质量指标
6. **结果输出**：生成高质量数据集，支持多种导出格式

### 2.3 用户界面设计

**RawData界面扩展**：
- 在文件库详情页面添加"启动流水线"按钮
- 支持批量选择文件进行流水线处理
- 显示文件的DataFlow处理状态和结果

**新增流水线管理页面**：
- 流水线配置界面
- 任务监控和进度跟踪
- 质量指标展示
- 结果预览和导出

**Dataset界面增强**：
- 在数据集创建时集成DataFlow流水线
- 支持从流水线结果直接创建数据集
- 展示数据质量评估结果

## 3. 技术实施方案

### 3.1 后端扩展

#### 3.1.1 DataFlow服务集成

**新增服务类**：
```python
# backend/app/services/dataflow_pipeline_service.py
class DataFlowPipelineService:
    """DataFlow流水线服务"""
    
    def __init__(self):
        self.integration = dataflow_integration
    
    def create_pipeline_task(self, task_type: str, library_id: str, file_ids: List[str], config: Dict):
        """创建流水线任务"""
        
    def process_pretrain_filter(self, files: List[str], config: Dict):
        """预训练数据过滤流水线"""
        
    def process_pretrain_synthetic(self, files: List[str], config: Dict):
        """预训练数据合成流水线"""
        
    def process_sft_filter(self, files: List[str], config: Dict):
        """SFT数据过滤流水线"""
        
    def process_sft_synthetic(self, files: List[str], config: Dict):
        """SFT数据合成流水线"""
```

**任务队列集成**：
```python
# backend/app/tasks/dataflow_tasks.py
@celery.task(bind=True)
def run_dataflow_pipeline(self, pipeline_type: str, file_data: List[Dict], config: Dict):
    """运行DataFlow流水线任务"""
    
    # 更新任务状态
    # 执行DataFlow流水线
    # 保存结果
    # 更新进度
```

#### 3.1.2 API端点扩展

**新增API路由**：
```python
# backend/app/api/v1/endpoints/dataflow.py
@api_v1.route('/dataflow/pipelines', methods=['POST'])
def create_pipeline_task():
    """创建流水线任务"""
    
@api_v1.route('/dataflow/pipelines/<task_id>/status', methods=['GET'])
def get_pipeline_status():
    """获取流水线任务状态"""
    
@api_v1.route('/dataflow/pipelines/<task_id>/results', methods=['GET'])
def get_pipeline_results():
    """获取流水线处理结果"""
```

**扩展现有API**：
```python
# 扩展 libraries.py
@api_v1.route('/libraries/<library_id>/dataflow', methods=['POST'])
def start_library_dataflow():
    """对文件库启动DataFlow处理"""
    
# 扩展 datasets.py  
@api_v1.route('/datasets/<dataset_id>/enhance', methods=['POST'])
def enhance_dataset_with_dataflow():
    """使用DataFlow增强数据集"""
```

#### 3.1.3 数据模型扩展

**新增数据模型**：
```python
# backend/app/models/dataflow_task.py
class DataFlowTask(db.Model):
    """DataFlow任务模型"""
    id = db.Column(db.String(36), primary_key=True)
    pipeline_type = db.Column(db.Enum(PipelineType), nullable=False)
    library_id = db.Column(db.String(36), db.ForeignKey('library.id'))
    file_ids = db.Column(db.JSON)
    config = db.Column(db.JSON)
    status = db.Column(db.Enum(TaskStatus), default=TaskStatus.PENDING)
    progress = db.Column(db.Integer, default=0)
    results = db.Column(db.JSON)
    quality_metrics = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
class DataFlowResult(db.Model):
    """DataFlow处理结果模型"""
    id = db.Column(db.String(36), primary_key=True)
    task_id = db.Column(db.String(36), db.ForeignKey('dataflow_task.id'))
    original_file_id = db.Column(db.String(36))
    processed_content = db.Column(db.Text)
    quality_score = db.Column(db.Float)
    metadata = db.Column(db.JSON)
    output_format = db.Column(db.String(50))
    minio_object_name = db.Column(db.String(255))
```

### 3.2 前端扩展

#### 3.2.1 RawData界面扩展

**文件库详情页面增强**：
```tsx
// frontend/src/screens/RawData/LibraryDetails/DataFlowPanel.tsx
export const DataFlowPanel: React.FC<{libraryId: string}> = ({ libraryId }) => {
  return (
    <Card className="border-[#d1dbe8]">
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4">DataFlow 流水线处理</h3>
        
        {/* 流水线类型选择 */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <PipelineTypeCard 
            type="pretrain_filter" 
            title="预训练数据过滤"
            description="对原始文本进行去重、改写和质量过滤"
          />
          <PipelineTypeCard 
            type="pretrain_synthetic" 
            title="预训练数据合成"
            description="生成QA对话形式的预训练数据"
          />
          <PipelineTypeCard 
            type="sft_filter" 
            title="SFT数据过滤"
            description="对SFT格式数据进行质量过滤"
          />
          <PipelineTypeCard 
            type="sft_synthetic" 
            title="SFT数据合成"
            description="从预训练文本合成SFT格式数据"
          />
        </div>
        
        {/* 文件选择和配置 */}
        <FileSelectionPanel libraryId={libraryId} />
        <PipelineConfigPanel />
        
        {/* 启动按钮 */}
        <Button onClick={handleStartPipeline}>
          启动流水线处理
        </Button>
      </div>
    </Card>
  );
};
```

**批量操作扩展**：
```tsx
// 在现有的批量操作下拉菜单中添加DataFlow选项
<DropdownMenuItem onClick={() => setShowDataFlowDialog(true)}>
  <Wand2 className="w-4 h-4 mr-2" />
  DataFlow 处理
</DropdownMenuItem>
```

#### 3.2.2 新增流水线管理页面

**流水线任务列表**：
```tsx
// frontend/src/screens/DataFlow/PipelineTasks.tsx
export const PipelineTasks: React.FC = () => {
  const [tasks, setTasks] = useState<DataFlowTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  return (
    <div className="w-full max-w-[1400px] p-6">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold leading-8 text-[#0c141c] mb-2">
          DataFlow 流水线任务
        </h1>
        <p className="text-[#4f7096] mb-4">
          管理和监控您的数据处理流水线任务
        </p>
      </div>
      
      {/* 任务统计卡片 */}
      <TaskStatisticsCards />
      
      {/* 任务列表 */}
      <TaskListTable tasks={tasks} />
      
      {/* 任务详情和监控 */}
      <TaskMonitorDialog />
    </div>
  );
};
```

**流水线配置界面**：
```tsx
// frontend/src/screens/DataFlow/PipelineConfig.tsx
export const PipelineConfig: React.FC<{
  pipelineType: PipelineType;
  onConfigChange: (config: PipelineConfig) => void;
}> = ({ pipelineType, onConfigChange }) => {
  // 根据流水线类型显示不同的配置选项
  // 预训练数据过滤：语言、质量阈值、去重参数等
  // 预训练数据合成：LLM配置、生成参数等
  // SFT数据过滤：质量评估模型、分数阈值等
  // SFT数据合成：指令模板、生成数量等
};
```

#### 3.2.3 Dataset界面增强

**数据集创建流程集成**：
```tsx
// 在SmartDatasetCreator中集成DataFlow
// Step 1: 选择数据源时，显示DataFlow处理状态
// Step 2: 配置数据集时，可选择是否启用DataFlow增强
// Step 3: 配置模型时，集成DataFlow的质量过滤选项
// Step 4: 预览时，显示DataFlow的质量评估结果
```

### 3.3 配置和部署

#### 3.3.1 DataFlow环境配置

**环境变量配置**：
```bash
# .env
DATAFLOW_ENABLED=true
DATAFLOW_MODEL_CACHE_DIR=/app/cache/dataflow
DATAFLOW_TEMP_DIR=/app/tmp/dataflow
DATAFLOW_MAX_WORKERS=4
DATAFLOW_BATCH_SIZE=10
```

**Docker配置更新**：
```dockerfile
# 在现有Dockerfile中添加DataFlow依赖
RUN pip install dataflow-requirements.txt
```

#### 3.3.2 数据库迁移

**创建新表结构**：
```sql
-- 创建DataFlow相关表
CREATE TABLE dataflow_tasks (
    id VARCHAR(36) PRIMARY KEY,
    pipeline_type VARCHAR(50) NOT NULL,
    library_id VARCHAR(36) REFERENCES libraries(id),
    file_ids JSON,
    config JSON,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    results JSON,
    quality_metrics JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE dataflow_results (
    id VARCHAR(36) PRIMARY KEY,
    task_id VARCHAR(36) REFERENCES dataflow_tasks(id),
    original_file_id VARCHAR(36),
    processed_content TEXT,
    quality_score FLOAT,
    metadata JSON,
    output_format VARCHAR(50),
    minio_object_name VARCHAR(255)
);
```

## 4. 实施计划

### 4.1 第一阶段：基础集成（2周）

**目标**：建立DataFlow基础集成框架

**任务清单**：
- [ ] 完善dataflow_integration.py，添加四大流水线支持
- [ ] 创建DataFlowPipelineService服务类
- [ ] 添加DataFlow相关数据模型
- [ ] 实现基础API端点
- [ ] 创建Celery任务队列
- [ ] 编写单元测试

**交付物**：
- 后端DataFlow集成服务
- 数据库迁移脚本
- API接口文档
- 基础测试用例

### 4.2 第二阶段：前端界面（2周）

**目标**：构建DataFlow操作界面

**任务清单**：
- [ ] 扩展RawData界面，添加DataFlow面板
- [ ] 创建流水线管理页面
- [ ] 实现任务监控和进度显示
- [ ] 添加配置界面和参数设置
- [ ] 集成到现有的批量操作流程
- [ ] 实现结果预览和导出功能

**交付物**：
- 前端DataFlow界面组件
- 任务监控页面
- 用户操作指南
- 界面交互测试

### 4.3 第三阶段：高级功能（2周）

**目标**：完善高级功能和优化

**任务清单**：
- [ ] 实现质量评估和指标展示
- [ ] 集成到智能数据集创建器
- [ ] 添加批量处理和并行优化
- [ ] 实现结果自动导入数据集
- [ ] 添加流水线模板和预设配置
- [ ] 优化性能和错误处理

**交付物**：
- 完整的DataFlow集成功能
- 性能优化报告
- 完整的用户文档
- 系统测试报告

### 4.4 第四阶段：测试和部署（1周）

**目标**：全面测试和生产部署

**任务清单**：
- [ ] 完整的功能测试
- [ ] 性能压力测试
- [ ] 用户体验测试
- [ ] 生产环境部署
- [ ] 监控和日志配置
- [ ] 用户培训和文档

**交付物**：
- 生产环境部署
- 监控配置
- 用户培训材料
- 运维文档

## 5. 质量保证

### 5.1 测试策略

**单元测试**：
- DataFlow服务类测试
- API端点测试
- 前端组件测试
- 数据模型测试

**集成测试**：
- 端到端流水线测试
- 文件处理流程测试
- 任务队列测试
- 数据一致性测试

**性能测试**：
- 大文件处理性能
- 并发任务处理能力
- 内存和CPU使用情况
- 响应时间测试

### 5.2 监控指标

**业务指标**：
- 流水线任务成功率
- 处理文件数量和大小
- 质量分数分布
- 用户使用频率

**技术指标**：
- API响应时间
- 任务队列长度
- 系统资源使用率
- 错误率和异常统计

### 5.3 风险控制

**数据安全**：
- 文件处理过程中的数据保护
- 敏感信息过滤和清理
- 访问权限控制
- 数据备份和恢复

**系统稳定性**：
- 任务失败重试机制
- 资源限制和防护
- 错误隔离和恢复
- 系统降级策略

## 6. 预期效果

### 6.1 功能提升

**数据质量提升**：
- 预训练数据过滤后质量提升30-50%
- SFT数据质量分数提升20-40%
- 数据去重率达到95%以上
- 有害内容过滤率达到99%以上

**处理效率提升**：
- 批量处理速度提升5-10倍
- 自动化程度提升80%
- 人工干预减少70%
- 数据标准化程度提升90%

### 6.2 用户体验改善

**操作便捷性**：
- 一键启动流水线处理
- 实时进度监控
- 智能参数推荐
- 结果可视化展示

**工作流程优化**：
- 文件上传→自动处理→数据集生成的完整流程
- 支持多种数据格式和输出格式
- 灵活的配置选项
- 完善的错误处理和重试机制

### 6.3 业务价值

**数据资产管理**：
- 提升数据质量和价值
- 降低数据处理成本
- 加快数据集制作速度
- 标准化数据处理流程

**技术能力提升**：
- 集成先进的数据处理技术
- 提供完整的数据处理解决方案
- 支持大规模数据处理
- 具备扩展性和可维护性

## 7. 后续规划

### 7.1 功能扩展

**更多流水线支持**：
- 多模态数据处理流水线
- 代码数据处理流水线
- 对话数据处理流水线
- 推理数据处理流水线

**AI能力增强**：
- 智能质量评估
- 自动参数调优
- 数据增强和生成
- 多语言支持

### 7.2 性能优化

**分布式处理**：
- 支持多机并行处理
- 动态资源分配
- 负载均衡优化
- 故障自动恢复

**缓存和优化**：
- 中间结果缓存
- 增量处理支持
- 内存优化
- 网络传输优化

### 7.3 生态集成

**外部系统集成**：
- 与MLOps平台集成
- 与数据湖系统集成
- 与模型训练平台集成
- API开放和第三方集成

**标准化和开源**：
- 数据处理标准制定
- 流水线配置标准化
- 开源社区贡献
- 最佳实践分享

---

*本文档将根据实施进展持续更新和完善* 
# 数据库迁移指南

## 概述

PinData 使用版本化的数据库迁移系统来管理数据库schema的变化，确保用户可以从任何老版本平滑升级到新版本。

## 迁移系统特性

- ✅ **版本化管理**: 每个迁移都有明确的版本号
- ✅ **事务安全**: 每个迁移在事务中执行，失败时自动回滚
- ✅ **幂等性**: 迁移可以安全地重复执行
- ✅ **回滚支持**: 支持迁移回滚（如果实现了down函数）
- ✅ **自动检测**: 启动时自动检测并执行必要的迁移
- ✅ **状态追踪**: 完整的迁移执行历史和状态记录

## 使用场景

### 1. 全新安装

全新安装时，系统会自动执行所有迁移，创建完整的数据库结构。

```bash
# 新安装用户直接启动即可
python run.py
```

### 2. 从老版本升级

老版本用户升级时，系统会自动检测当前数据库状态并执行必要的迁移。

```bash
# 查看当前迁移状态
./migrate status

# 手动执行迁移（如果禁用了自动迁移）
./migrate migrate

# 启动应用（自动迁移）
python run.py
```

### 3. 开发环境

开发者可以使用CLI工具管理迁移：

```bash
# 查看迁移状态
./migrate status

# 创建新迁移
./migrate create "add user avatar field"

# 执行迁移
./migrate migrate

# 检测数据库状态
./migrate detect
```

## 迁移版本历史

### v1.0.0 - 创建用户管理系统
- 创建用户认证和权限管理系统
- 包含用户、角色、权限、会话管理
- 支持RBAC权限控制

### v1.0.1 - 修复已存在表
- 处理从手动创建表升级到迁移管理的情况
- 修复表结构差异
- 确保向后兼容

## 配置选项

在 `.env` 文件中可以配置迁移行为：

```bash
# 是否启用自动迁移（默认: true）
AUTO_MIGRATE=true

# 数据库连接URL
DATABASE_URL=postgresql://postgres:password@localhost:5432/pindata_dataset
```

## CLI工具使用

### 查看迁移状态
```bash
./migrate status
```
输出示例：
```
=== 数据库迁移状态 ===
当前版本: v1.0.1

迁移列表:
  v1.0.0     ✅ 已执行      v1.0.0_create_user_management_migration.py
  v1.0.1     ✅ 已执行      v1.0.1_fix_existing_tables_migration.py
```

### 执行迁移
```bash
# 执行所有待迁移
./migrate migrate

# 迁移到指定版本
./migrate migrate --target v1.1.0

# 预览将要执行的迁移
./migrate migrate --dry-run
```

### 检测数据库状态
```bash
./migrate detect
```
输出示例：
```
当前数据库schema检测结果:
  - 表总数: 15
  - 用户表: ✅
  - 认证系统: ✅
  - 迁移表: ✅

✅ 数据库状态正常
```

### 创建新迁移
```bash
./migrate create "add user preferences table"
```

## 迁移脚本开发

### 文件命名规范
```
v{major}.{minor}.{patch}_{description}_migration.py
```
例如：`v1.2.0_add_user_preferences_migration.py`

### 迁移脚本结构
```python
#!/usr/bin/env python3
"""
v1.2.0 添加用户偏好设置

描述迁移的目的和影响
"""

from sqlalchemy import text
from datetime import datetime

MIGRATION_VERSION = "v1.2.0"
MIGRATION_DESCRIPTION = "添加用户偏好设置"
MIGRATION_AUTHOR = "开发者姓名"
MIGRATION_DATE = "2025-06-11T21:00:00"

def up(conn):
    """执行迁移"""
    print(f"执行迁移: {MIGRATION_DESCRIPTION}")
    
    # 创建表（使用IF NOT EXISTS确保幂等性）
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS user_preferences (
            id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            user_id VARCHAR(36) NOT NULL,
            theme VARCHAR(20) DEFAULT 'light',
            language VARCHAR(10) DEFAULT 'zh',
            timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """))
    
    # 创建索引
    conn.execute(text("""
        CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
        ON user_preferences (user_id)
    """))
    
    print("✅ 迁移执行完成")

def down(conn):
    """回滚迁移"""
    print(f"回滚迁移: {MIGRATION_DESCRIPTION}")
    
    conn.execute(text("DROP TABLE IF EXISTS user_preferences CASCADE"))
    
    print("✅ 迁移回滚完成")
```

## 最佳实践

### 1. 迁移设计原则
- **幂等性**: 迁移应该可以安全地重复执行
- **向后兼容**: 尽量保持向后兼容性
- **小步快跑**: 将大的变更拆分为多个小迁移
- **测试验证**: 在测试环境充分验证后再发布

### 2. 数据迁移注意事项
```python
def up(conn):
    # ✅ 好的做法：分批处理大量数据
    batch_size = 1000
    offset = 0
    
    while True:
        result = conn.execute(text(f"""
            UPDATE users SET status = 'ACTIVE' 
            WHERE status IS NULL 
            LIMIT {batch_size} OFFSET {offset}
        """))
        
        if result.rowcount == 0:
            break
            
        offset += batch_size
        print(f"处理了 {offset} 条记录")
```

### 3. 安全措施
- 备份数据库后再执行迁移
- 在测试环境先验证迁移
- 提供回滚方案
- 监控迁移执行过程

## 故障排除

### 迁移失败处理
```bash
# 查看失败的迁移详情
./migrate status

# 检查数据库状态
./migrate detect

# 手动修复后重新执行
./migrate migrate
```

### 常见问题

1. **表已存在错误**
   - 使用 `IF NOT EXISTS` 子句
   - 检查并处理已存在的结构

2. **数据类型冲突**
   - 提供数据转换逻辑
   - 分步骤进行结构变更

3. **外键约束错误**
   - 正确的删除顺序
   - 临时禁用约束检查

## 版本兼容性

| 版本 | 兼容性 | 说明 |
|------|--------|------|
| v1.0.0 | ✅ | 基础用户管理系统 |
| v1.0.1 | ✅ | 修复已存在表兼容性 |
| 未来版本 | ✅ | 向后兼容，平滑升级 |

## 生产环境部署

### 部署前检查
```bash
# 1. 备份数据库
pg_dump pindata_dataset > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 检查迁移状态
./migrate status

# 3. 预览将要执行的操作
./migrate migrate --dry-run

# 4. 执行迁移
./migrate migrate

# 5. 启动应用
python run.py
```

### 监控和日志
迁移执行过程会记录详细日志，包括：
- 执行时间
- 影响的记录数
- 错误信息
- 执行状态

## 总结

PinData的迁移系统确保了：
- 老版本用户可以无缝升级到新版本
- 数据库结构变更可控且可追溯
- 开发和部署过程标准化
- 降低版本升级的风险

通过使用这个迁移系统，您可以放心地升级PinData，不用担心数据丢失或结构冲突的问题。
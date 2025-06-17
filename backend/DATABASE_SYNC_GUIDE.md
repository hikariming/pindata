# 数据库同步解决方案指南

## 🚨 问题描述

如果你在大版本更新后遇到以下错误：

```
(psycopg2.errors.UndefinedColumn) column user_organizations.status does not exist
```

这表明你的数据库结构与新版本代码不匹配，需要进行数据库同步。

## 🔧 解决方案

我们提供了多种自动化解决方案，选择适合你情况的方法：

### 方案一：应用启动时自动修复（推荐）

✅ **最简单的方法** - 新版本已内置自动修复功能

1. **直接启动应用**
   ```bash
   python run.py
   ```

2. **查看启动日志**
   应用会自动检测并修复数据库结构问题：
   ```
   INFO - 开始数据库健康检查...
   INFO - 检测到数据库结构问题
   INFO - 尝试自动修复数据库问题...
   INFO - 数据库问题已自动修复
   INFO - 数据库健康检查通过
   ```

3. **如果自动修复失败**
   查看日志中的错误信息，然后使用方案二手动修复。

### 方案二：使用独立同步脚本

如果自动修复失败，可以使用独立的同步脚本：

1. **检查数据库状态**
   ```bash
   cd backend
   python sync_database.py --check
   ```

2. **同步数据库结构**
   ```bash
   python sync_database.py --sync
   ```

3. **强制同步（跳过确认）**
   ```bash
   python sync_database.py --sync --force
   ```

### 方案三：使用完整迁移脚本

使用我们提供的完整迁移脚本：

1. **执行完整迁移**
   ```bash
   cd backend
   ./migrate migrate
   ```

2. **查看迁移状态**
   ```bash
   ./migrate status
   ```

3. **检测数据库状态**
   ```bash
   ./migrate detect
   ```

## 🛠️ 手动修复（仅在自动修复失败时使用）

如果所有自动方案都失败，可以手动执行以下SQL：

```sql
-- 1. 创建枚举类型
DO $$ BEGIN
    CREATE TYPE userorgstatus AS ENUM ('active', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE '枚举类型已存在';
END $$;

-- 2. 添加缺失字段
ALTER TABLE user_organizations 
ADD COLUMN IF NOT EXISTS status userorgstatus DEFAULT 'active';

ALTER TABLE user_organizations 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE user_organizations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 3. 更新现有记录
UPDATE user_organizations 
SET status = 'active' 
WHERE status IS NULL;

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_user_organizations_status 
ON user_organizations(status);
```

## 🐳 Docker 容器用户

### 对于使用 Docker 的用户：

1. **重启容器**（推荐）
   ```bash
   docker-compose down
   docker-compose up -d
   ```
   新版本会在启动时自动修复数据库。

2. **在运行的容器中执行修复**
   ```bash
   # 进入容器
   docker exec -it your_container_name bash
   
   # 执行同步脚本
   python sync_database.py --sync --force
   ```

3. **使用 docker-compose 执行**
   ```bash
   docker-compose exec backend python sync_database.py --sync --force
   ```

## 📋 验证修复结果

修复完成后，验证是否成功：

1. **检查数据库状态**
   ```bash
   python sync_database.py --check
   ```

2. **启动应用**
   ```bash
   python run.py
   ```

3. **测试API**
   ```bash
   curl http://localhost:5000/api/v1/health
   ```

应该能正常访问，不再出现字段不存在的错误。

## 🔍 常见问题

### Q: 为什么会出现这个问题？
A: 你从老版本升级到了新版本，数据库结构没有跟上代码更新。新版本的用户管理系统增加了status字段等。

### Q: 数据会丢失吗？
A: 不会。我们的脚本只添加缺失的字段和结构，不会删除现有数据。

### Q: 修复失败怎么办？
A: 
1. 检查数据库权限
2. 检查数据库连接
3. 查看详细错误日志
4. 联系技术支持

### Q: 可以禁用自动修复吗？
A: 可以在环境变量中设置：
```bash
export AUTO_FIX_DATABASE=false
```

## 🚀 预防未来问题

为了避免类似问题：

1. **启用自动迁移**（默认已开启）
   ```bash
   export AUTO_MIGRATE=true
   export AUTO_FIX_DATABASE=true
   ```

2. **定期检查数据库状态**
   ```bash
   python sync_database.py --check
   ```

3. **升级前备份数据库**
   ```bash
   pg_dump your_database > backup.sql
   ```

## 📞 技术支持

如果以上方案都无法解决问题：

1. 记录完整的错误日志
2. 记录你的环境信息（Python版本、数据库版本等）
3. 联系技术支持团队

---

## ⚡ 快速解决方案摘要

**最快的解决方法：**

```bash
# 1. 停止应用
# 2. 直接重启（新版本会自动修复）
python run.py

# 如果还有问题，执行：
python sync_database.py --sync --force

# 然后重启应用
python run.py
```

这应该能解决 99% 的数据库同步问题！ 
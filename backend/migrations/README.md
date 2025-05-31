这个目录用于存放数据库迁移脚本，通常由 Alembic 管理。

如何初始化 Alembic (如果尚未使用):
1. `pip install alembic`
2. `alembic init migrations` (在 backend 目录下运行此命令，它会创建 migrations 目录及相关文件)
3. 配置 `migrations/env.py` 来指向你的数据库模型和连接。
4. 配置 `alembic.ini` 中的 `sqlalchemy.url`。 
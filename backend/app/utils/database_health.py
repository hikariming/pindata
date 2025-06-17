#!/usr/bin/env python3
"""
数据库健康检查工具

在应用启动时自动检测数据库结构是否与代码模型匹配，
并提供自动修复功能。
"""

import os
import logging
from sqlalchemy import text, inspect
from sqlalchemy.exc import ProgrammingError
from datetime import datetime

logger = logging.getLogger(__name__)

class DatabaseHealthChecker:
    """数据库健康检查器"""
    
    def __init__(self, db_engine):
        self.engine = db_engine
        self.issues = []
        
    def check_health(self) -> dict:
        """检查数据库健康状况"""
        logger.info("开始数据库健康检查...")
        
        health_report = {
            'healthy': True,
            'issues': [],
            'warnings': [],
            'suggestions': []
        }
        
        try:
            with self.engine.connect() as conn:
                inspector = inspect(conn)
                
                # 检查表结构
                self._check_table_structure(inspector, health_report)
                
                # 检查枚举类型
                self._check_enum_types(conn, health_report)
                
                # 检查索引
                self._check_indexes(inspector, health_report)
                
                # 检查迁移记录
                self._check_migration_records(conn, inspector, health_report)
                
        except Exception as e:
            logger.error(f"数据库健康检查失败: {e}")
            health_report['healthy'] = False
            health_report['issues'].append(f"数据库连接或查询失败: {e}")
        
        # 判断整体健康状况
        if health_report['issues']:
            health_report['healthy'] = False
        
        logger.info(f"数据库健康检查完成 - 健康状况: {'良好' if health_report['healthy'] else '存在问题'}")
        
        return health_report
    
    def _check_table_structure(self, inspector, health_report):
        """检查表结构"""
        tables = inspector.get_table_names()
        
        # 检查关键表是否存在
        required_tables = [
            'users', 'organizations', 'user_organizations', 
            'user_roles', 'roles', 'permissions'
        ]
        
        for table in required_tables:
            if table not in tables:
                health_report['issues'].append(f"缺失关键表: {table}")
        
        # 检查 user_organizations 表字段
        if 'user_organizations' in tables:
            self._check_user_organizations_columns(inspector, health_report)
        
        # 检查其他关键表字段
        if 'users' in tables:
            self._check_users_columns(inspector, health_report)
    
    def _check_user_organizations_columns(self, inspector, health_report):
        """检查 user_organizations 表字段"""
        try:
            columns = {col['name']: col for col in inspector.get_columns('user_organizations')}
            
            required_columns = ['status', 'created_at', 'updated_at']
            
            for col in required_columns:
                if col not in columns:
                    health_report['issues'].append(f"user_organizations 表缺失字段: {col}")
                    
        except Exception as e:
            health_report['issues'].append(f"检查 user_organizations 表字段时出错: {e}")
    
    def _check_users_columns(self, inspector, health_report):
        """检查 users 表字段"""
        try:
            columns = {col['name']: col for col in inspector.get_columns('users')}
            
            recommended_columns = ['avatar_url', 'status', 'last_login_at']
            
            for col in recommended_columns:
                if col not in columns:
                    health_report['warnings'].append(f"users 表建议添加字段: {col}")
                    
        except Exception as e:
            health_report['warnings'].append(f"检查 users 表字段时出错: {e}")
    
    def _check_enum_types(self, conn, health_report):
        """检查枚举类型"""
        try:
            result = conn.execute(text("""
                SELECT typname FROM pg_type 
                WHERE typtype = 'e' 
                ORDER BY typname
            """))
            
            existing_enums = [row[0] for row in result.fetchall()]
            required_enums = ['userorgstatus', 'user_status']
            
            for enum_name in required_enums:
                if enum_name not in existing_enums:
                    health_report['issues'].append(f"缺失枚举类型: {enum_name}")
                    
        except Exception as e:
            health_report['warnings'].append(f"检查枚举类型时出错: {e}")
    
    def _check_indexes(self, inspector, health_report):
        """检查索引"""
        try:
            tables = inspector.get_table_names()
            
            # 检查关键索引
            if 'user_organizations' in tables:
                indexes = inspector.get_indexes('user_organizations')
                index_names = [idx['name'] for idx in indexes]
                
                if not any('status' in idx.get('column_names', []) for idx in indexes):
                    health_report['warnings'].append("建议为 user_organizations.status 添加索引")
                    
        except Exception as e:
            health_report['warnings'].append(f"检查索引时出错: {e}")
    
    def _check_migration_records(self, conn, inspector, health_report):
        """检查迁移记录"""
        try:
            if 'schema_migrations' not in inspector.get_table_names():
                health_report['issues'].append("缺失迁移记录表 schema_migrations")
                return
            
            result = conn.execute(text("SELECT COUNT(*) FROM schema_migrations"))
            count = result.fetchone()[0]
            
            if count == 0:
                health_report['warnings'].append("迁移记录表为空，可能需要同步历史迁移记录")
            
        except Exception as e:
            health_report['warnings'].append(f"检查迁移记录时出错: {e}")
    
    def auto_fix_issues(self) -> bool:
        """自动修复发现的问题"""
        logger.info("开始自动修复数据库问题...")
        
        try:
            # 修复枚举类型（使用独立连接）
            if not self._fix_enum_types():
                logger.error("枚举类型修复失败")
                return False
            
            # 修复表结构（使用独立连接）
            if not self._fix_table_structure():
                logger.error("表结构修复失败")
                return False
            
            # 创建索引（使用独立连接）
            if not self._fix_indexes():
                logger.error("索引创建失败")
                return False
            
            logger.info("数据库问题修复完成")
            return True
            
        except Exception as e:
            logger.error(f"数据库修复过程出错: {e}")
            return False
    
    def _fix_enum_types(self) -> bool:
        """修复枚举类型"""
        try:
            with self.engine.connect() as conn:
                enums_to_create = [
                    ("userorgstatus", ['active', 'inactive']),
                    ("user_status", ['ACTIVE', 'INACTIVE', 'SUSPENDED']),
                ]
                
                for enum_name, values in enums_to_create:
                    try:
                        # 使用自动提交模式
                        trans = conn.begin()
                        values_str = "', '".join(values)
                        conn.execute(text(f"""
                            DO $$ BEGIN
                                CREATE TYPE {enum_name} AS ENUM ('{values_str}');
                            EXCEPTION
                                WHEN duplicate_object THEN 
                                    RAISE NOTICE '枚举类型 {enum_name} 已存在';
                            END $$;
                        """))
                        trans.commit()
                        logger.info(f"确保枚举类型存在: {enum_name}")
                    except Exception as e:
                        trans.rollback()
                        logger.warning(f"处理枚举类型 {enum_name} 时出错: {e}")
                        # 继续处理其他枚举类型
                        continue
            
            return True
            
        except Exception as e:
            logger.error(f"修复枚举类型失败: {e}")
            return False
    
    def _fix_table_structure(self) -> bool:
        """修复表结构"""
        try:
            with self.engine.connect() as conn:
                # 修复 user_organizations 表
                if not self._fix_user_organizations_table(conn):
                    return False
                
                # 修复 users 表
                if not self._fix_users_table(conn):
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"修复表结构失败: {e}")
            return False
    
    def _fix_user_organizations_table(self, conn) -> bool:
        """修复 user_organizations 表"""
        try:
            # 检查表是否存在
            inspector = inspect(conn)
            if 'user_organizations' not in inspector.get_table_names():
                logger.warning("user_organizations 表不存在，跳过修复")
                return True
            
            # 获取现有字段
            columns = {col['name']: col for col in inspector.get_columns('user_organizations')}
            
            # 逐个添加字段
            fields_to_add = [
                ('status', 'userorgstatus DEFAULT \'active\''),
                ('created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
                ('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
            ]
            
            for field_name, field_def in fields_to_add:
                if field_name not in columns:
                    trans = None
                    try:
                        trans = conn.begin()
                        conn.execute(text(f"""
                            ALTER TABLE user_organizations 
                            ADD COLUMN {field_name} {field_def}
                        """))
                        trans.commit()
                        logger.info(f"添加字段 user_organizations.{field_name}")
                    except Exception as e:
                        if trans:
                            trans.rollback()
                        logger.error(f"添加字段 {field_name} 失败: {e}")
                        # 对于status字段失败，尝试其他方法
                        if field_name == 'status':
                            if not self._fix_status_field_alternative(conn):
                                return False
                        else:
                            return False
            
            # 更新现有记录的状态
            if 'status' not in columns:
                trans = None
                try:
                    trans = conn.begin()
                    conn.execute(text("""
                        UPDATE user_organizations 
                        SET status = 'active' 
                        WHERE status IS NULL
                    """))
                    trans.commit()
                    logger.info("更新现有记录状态完成")
                except Exception as e:
                    if trans:
                        trans.rollback()
                    logger.error(f"更新记录状态失败: {e}")
                    return False
            
            logger.info("修复 user_organizations 表结构完成")
            return True
            
        except Exception as e:
            logger.error(f"修复 user_organizations 表时出错: {e}")
            return False
    
    def _fix_status_field_alternative(self, conn) -> bool:
        """使用备用方法修复status字段"""
        try:
            logger.info("尝试备用方法添加status字段...")
            
            # 方法1：先检查枚举类型的值
            trans = None
            try:
                trans = conn.begin()
                result = conn.execute(text("""
                    SELECT enumlabel FROM pg_enum e 
                    JOIN pg_type t ON e.enumtypid = t.oid 
                    WHERE t.typname = 'userorgstatus'
                    ORDER BY enumsortorder
                """))
                enum_values = [row[0] for row in result.fetchall()]
                trans.commit()
                
                if 'active' not in enum_values:
                    logger.warning(f"枚举类型 userorgstatus 的值为: {enum_values}")
                    # 如果枚举值不匹配，使用第一个值作为默认值
                    default_value = enum_values[0] if enum_values else 'active'
                else:
                    default_value = 'active'
                
            except Exception as e:
                if trans:
                    trans.rollback()
                logger.warning(f"检查枚举值失败: {e}")
                default_value = 'active'
            
            # 方法2：尝试不同的默认值
            trans = None
            try:
                trans = conn.begin()
                conn.execute(text(f"""
                    ALTER TABLE user_organizations 
                    ADD COLUMN status userorgstatus DEFAULT '{default_value}'
                """))
                trans.commit()
                logger.info(f"使用默认值 '{default_value}' 添加status字段成功")
                return True
            except Exception as e:
                if trans:
                    trans.rollback()
                logger.warning(f"使用默认值 '{default_value}' 失败: {e}")
            
            # 方法3：不使用默认值
            trans = None
            try:
                trans = conn.begin()
                conn.execute(text("""
                    ALTER TABLE user_organizations 
                    ADD COLUMN status userorgstatus
                """))
                trans.commit()
                logger.info("不使用默认值添加status字段成功")
                return True
            except Exception as e:
                if trans:
                    trans.rollback()
                logger.error(f"不使用默认值也失败: {e}")
                return False
                
        except Exception as e:
            logger.error(f"备用方法修复status字段失败: {e}")
            return False
    
    def _fix_users_table(self, conn) -> bool:
        """修复 users 表"""
        try:
            # 检查表是否存在
            inspector = inspect(conn)
            if 'users' not in inspector.get_table_names():
                logger.warning("users 表不存在，跳过修复")
                return True
            
            # 获取现有字段
            columns = {col['name']: col for col in inspector.get_columns('users')}
            
            # 逐个添加字段
            fields_to_add = [
                ('avatar_url', 'TEXT'),
                ('status', 'user_status DEFAULT \'ACTIVE\''),
                ('last_login_at', 'TIMESTAMP')
            ]
            
            for field_name, field_def in fields_to_add:
                if field_name not in columns:
                    try:
                        trans = conn.begin()
                        conn.execute(text(f"""
                            ALTER TABLE users 
                            ADD COLUMN {field_name} {field_def}
                        """))
                        trans.commit()
                        logger.info(f"添加字段 users.{field_name}")
                    except Exception as e:
                        trans.rollback()
                        logger.warning(f"添加字段 {field_name} 失败: {e}")
                        # 对于非关键字段，继续处理
                        continue
            
            logger.info("修复 users 表结构完成")
            return True
            
        except Exception as e:
            logger.error(f"修复 users 表时出错: {e}")
            return False
    
    def _fix_indexes(self) -> bool:
        """创建必需的索引"""
        try:
            with self.engine.connect() as conn:
                indexes = [
                    ("user_organizations", "idx_user_organizations_status", "status"),
                    ("users", "idx_users_status", "status"),
                ]
                
                for table, index_name, column in indexes:
                    try:
                        trans = conn.begin()
                        conn.execute(text(f"""
                            CREATE INDEX IF NOT EXISTS {index_name} 
                            ON {table} ({column})
                        """))
                        trans.commit()
                        logger.info(f"创建索引 {index_name}")
                    except Exception as e:
                        trans.rollback()
                        logger.warning(f"创建索引 {index_name} 失败: {e}")
                        # 索引创建失败不是致命错误，继续处理
                        continue
            
            return True
            
        except Exception as e:
            logger.error(f"创建索引失败: {e}")
            return False

def check_and_fix_database_on_startup(db_engine, auto_fix=True):
    """
    应用启动时检查和修复数据库
    
    Args:
        db_engine: SQLAlchemy引擎
        auto_fix: 是否自动修复问题
    
    Returns:
        bool: 数据库是否健康
    """
    checker = DatabaseHealthChecker(db_engine)
    
    # 检查健康状况
    health_report = checker.check_health()
    
    if not health_report['healthy']:
        logger.warning("检测到数据库结构问题:")
        for issue in health_report['issues']:
            logger.warning(f"  - {issue}")
        
        if auto_fix:
            logger.info("尝试自动修复数据库问题...")
            success = checker.auto_fix_issues()
            
            if success:
                # 重新检查
                health_report = checker.check_health()
                if health_report['healthy']:
                    logger.info("数据库问题已自动修复")
                    return True
                else:
                    logger.error("自动修复后仍存在问题")
                    return False
            else:
                logger.error("自动修复失败")
                return False
        else:
            logger.warning("跳过自动修复，请手动处理数据库问题")
            return False
    
    else:
        logger.info("数据库健康状况良好")
        
        # 显示警告信息
        for warning in health_report['warnings']:
            logger.warning(f"建议: {warning}")
        
        return True 
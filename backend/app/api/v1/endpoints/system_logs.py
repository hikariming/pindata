from flask import Blueprint, request
from flask_restful import Api, Resource
from sqlalchemy import or_, and_, desc
from marshmallow import ValidationError
from datetime import datetime, timedelta
from app.models import SystemLog, LogLevel
from app.api.v1.schemas.llm_schemas import SystemLogQuerySchema
from app.db import db
import logging

# 创建蓝图
system_logs_bp = Blueprint('system_logs', __name__)
api = Api(system_logs_bp)

logger = logging.getLogger(__name__)

class SystemLogListResource(Resource):
    """系统日志列表资源"""
    
    def options(self):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self):
        """获取系统日志列表"""
        try:
            # 验证查询参数
            schema = SystemLogQuerySchema()
            args = schema.load(request.args)
            
            # 构建查询
            query = SystemLog.query
            
            # 筛选条件
            if args.get('level'):
                query = query.filter(SystemLog.level == LogLevel(args['level']))
            
            if args.get('source'):
                query = query.filter(SystemLog.source.ilike(f"%{args['source']}%"))
            
            if args.get('request_id'):
                query = query.filter(SystemLog.request_id == args['request_id'])
            
            # 时间范围筛选
            if args.get('start_date'):
                query = query.filter(SystemLog.created_at >= args['start_date'])
            
            if args.get('end_date'):
                query = query.filter(SystemLog.created_at <= args['end_date'])
            
            # 搜索功能
            if args.get('search'):
                search_term = f"%{args['search']}%"
                query = query.filter(
                    or_(
                        SystemLog.message.ilike(search_term),
                        SystemLog.details.ilike(search_term),
                        SystemLog.source.ilike(search_term)
                    )
                )
            
            # 排序（最新的在前）
            query = query.order_by(desc(SystemLog.created_at))
            
            # 分页
            page = args.get('page', 1)
            per_page = args.get('per_page', 20)
            pagination = query.paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            # 转换为字典
            logs = [log.to_dict() for log in pagination.items]
            
            return {
                'success': True,
                'data': {
                    'logs': logs,
                    'pagination': {
                        'page': pagination.page,
                        'per_page': pagination.per_page,
                        'total': pagination.total,
                        'pages': pagination.pages,
                        'has_next': pagination.has_next,
                        'has_prev': pagination.has_prev
                    }
                }
            }, 200
            
        except ValidationError as e:
            return {'success': False, 'message': '参数验证失败', 'errors': e.messages}, 400
        except Exception as e:
            logger.error(f"获取系统日志列表失败: {str(e)}")
            return {'success': False, 'message': '服务器内部错误'}, 500

class SystemLogResource(Resource):
    """单个系统日志资源"""
    
    def options(self, log_id):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self, log_id):
        """获取单个日志详情"""
        try:
            log = SystemLog.query.get(log_id)
            if not log:
                return {'success': False, 'message': '日志不存在'}, 404
            
            return {
                'success': True,
                'data': log.to_dict()
            }, 200
            
        except Exception as e:
            logger.error(f"获取系统日志详情失败: {str(e)}")
            return {'success': False, 'message': '服务器内部错误'}, 500

class SystemLogStatsResource(Resource):
    """系统日志统计资源"""
    
    def options(self):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def get(self):
        """获取日志统计信息"""
        try:
            hours = request.args.get('hours', 24, type=int)
            
            # 获取基本统计
            stats = SystemLog.get_stats(hours=hours)
            
            # 获取总计数
            total_logs = SystemLog.query.count()
            
            # 获取最近错误数量
            recent_errors = SystemLog.query.filter(
                and_(
                    SystemLog.level == LogLevel.ERROR,
                    SystemLog.created_at >= datetime.utcnow() - timedelta(hours=1)
                )
            ).count()
            
            # 获取活跃来源
            from sqlalchemy import func
            active_sources = db.session.query(
                SystemLog.source,
                func.count(SystemLog.id).label('count')
            ).filter(
                SystemLog.created_at >= datetime.utcnow() - timedelta(hours=hours)
            ).group_by(SystemLog.source).order_by(
                desc(func.count(SystemLog.id))
            ).limit(10).all()
            
            return {
                'success': True,
                'data': {
                    'level_stats': stats,
                    'total_logs': total_logs,
                    'recent_errors': recent_errors,
                    'active_sources': [
                        {'source': source, 'count': count}
                        for source, count in active_sources
                    ],
                    'time_range_hours': hours
                }
            }, 200
            
        except Exception as e:
            logger.error(f"获取日志统计失败: {str(e)}")
            return {'success': False, 'message': '服务器内部错误'}, 500

class SystemLogCleanupResource(Resource):
    """系统日志清理资源"""
    
    def options(self):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def post(self):
        """清理旧日志"""
        try:
            days = request.json.get('days', 30) if request.json else 30
            
            if days < 1:
                return {'success': False, 'message': '保留天数必须大于0'}, 400
            
            deleted_count = SystemLog.cleanup_old_logs(days=days)
            
            # 记录清理日志
            SystemLog.log_info(
                f"清理了 {deleted_count} 条超过 {days} 天的日志记录",
                "SystemLog",
                extra_data={'deleted_count': deleted_count, 'retention_days': days}
            )
            
            return {
                'success': True,
                'message': f'成功清理 {deleted_count} 条日志记录',
                'data': {
                    'deleted_count': deleted_count,
                    'retention_days': days
                }
            }, 200
            
        except Exception as e:
            logger.error(f"清理日志失败: {str(e)}")
            SystemLog.log_error(f"清理日志失败: {str(e)}", "SystemLog")
            return {'success': False, 'message': '清理日志失败'}, 500

class SystemLogExportResource(Resource):
    """系统日志导出资源"""
    
    def options(self):
        """处理 CORS 预检请求"""
        return {}, 200
    
    def post(self):
        """导出日志"""
        try:
            # 获取筛选条件
            filters = request.json or {}
            
            query = SystemLog.query
            
            # 应用筛选条件
            if filters.get('level'):
                query = query.filter(SystemLog.level == LogLevel(filters['level']))
            
            if filters.get('source'):
                query = query.filter(SystemLog.source.ilike(f"%{filters['source']}%"))
            
            if filters.get('start_date'):
                start_date = datetime.fromisoformat(filters['start_date'].replace('Z', '+00:00'))
                query = query.filter(SystemLog.created_at >= start_date)
            
            if filters.get('end_date'):
                end_date = datetime.fromisoformat(filters['end_date'].replace('Z', '+00:00'))
                query = query.filter(SystemLog.created_at <= end_date)
            
            # 限制导出数量（防止内存溢出）
            limit = min(filters.get('limit', 10000), 50000)
            logs = query.order_by(desc(SystemLog.created_at)).limit(limit).all()
            
            # 转换为导出格式
            export_data = []
            for log in logs:
                log_dict = log.to_dict()
                # 移除不必要的字段
                log_dict.pop('id', None)
                log_dict.pop('extra_data', None)
                export_data.append(log_dict)
            
            # 记录导出日志
            SystemLog.log_info(
                f"导出了 {len(export_data)} 条日志记录",
                "SystemLog",
                extra_data={'export_count': len(export_data), 'filters': filters}
            )
            
            return {
                'success': True,
                'data': {
                    'logs': export_data,
                    'count': len(export_data),
                    'exported_at': datetime.utcnow().isoformat()
                }
            }, 200
            
        except Exception as e:
            logger.error(f"导出日志失败: {str(e)}")
            SystemLog.log_error(f"导出日志失败: {str(e)}", "SystemLog")
            return {'success': False, 'message': '导出日志失败'}, 500

# 注册路由
api.add_resource(SystemLogListResource, '/logs')
api.add_resource(SystemLogResource, '/logs/<string:log_id>')
api.add_resource(SystemLogStatsResource, '/logs/stats')
api.add_resource(SystemLogCleanupResource, '/logs/cleanup')
api.add_resource(SystemLogExportResource, '/logs/export') 
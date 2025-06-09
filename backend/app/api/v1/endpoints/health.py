from flask import Blueprint, jsonify
from app.utils.db_utils import DatabaseHealthCheck, check_database_connection
import logging

logger = logging.getLogger(__name__)

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """
    系统健康检查接口
    ---
    tags:
      - Health
    responses:
      200:
        description: 健康状态信息
        schema:
          type: object
          properties:
            status:
              type: string
              description: 总体状态 (healthy/warning/unhealthy/error)
            timestamp:
              type: string
              description: 检查时间
            checks:
              type: object
              description: 各项检查结果
            info:
              type: object
              description: 系统信息
            errors:
              type: array
              description: 错误信息列表
    """
    try:
        health_status = DatabaseHealthCheck.full_health_check()
        
        # 添加时间戳
        from datetime import datetime
        health_status['timestamp'] = datetime.utcnow().isoformat()
        
        # 根据状态设置HTTP状态码
        status_code = 200
        if health_status['overall_status'] == 'unhealthy':
            status_code = 503  # Service Unavailable
        elif health_status['overall_status'] == 'error':
            status_code = 500  # Internal Server Error
        
        return jsonify(health_status), status_code
        
    except Exception as e:
        logger.error(f"健康检查接口异常: {e}")
        return jsonify({
            'status': 'error',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 500

@health_bp.route('/health/database', methods=['GET'])
def database_health():
    """
    数据库连接检查接口
    ---
    tags:
      - Health
    responses:
      200:
        description: 数据库健康状态
        schema:
          type: object
          properties:
            status:
              type: string
              description: 数据库状态 (healthy/unhealthy)
            connected:
              type: boolean
              description: 是否连接成功
            timestamp:
              type: string
              description: 检查时间
    """
    try:
        from datetime import datetime
        
        is_connected = check_database_connection()
        
        result = {
            'status': 'healthy' if is_connected else 'unhealthy',
            'connected': is_connected,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        status_code = 200 if is_connected else 503
        return jsonify(result), status_code
        
    except Exception as e:
        logger.error(f"数据库健康检查接口异常: {e}")
        from datetime import datetime
        return jsonify({
            'status': 'error',
            'connected': False,
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 500

@health_bp.route('/health/ready', methods=['GET'])
def readiness_check():
    """
    就绪状态检查接口（用于Kubernetes等容器编排）
    ---
    tags:
      - Health
    responses:
      200:
        description: 服务就绪
      503:
        description: 服务未就绪
    """
    try:
        # 检查关键组件是否就绪
        is_ready = check_database_connection()
        
        if is_ready:
            return jsonify({'status': 'ready'}), 200
        else:
            return jsonify({'status': 'not ready', 'reason': 'database connection failed'}), 503
            
    except Exception as e:
        logger.error(f"就绪检查接口异常: {e}")
        return jsonify({'status': 'error', 'error': str(e)}), 500

@health_bp.route('/health/live', methods=['GET'])
def liveness_check():
    """
    存活状态检查接口（用于Kubernetes等容器编排）
    ---
    tags:
      - Health
    responses:
      200:
        description: 服务存活
    """
    # 存活检查通常只检查进程是否正在运行
    # 这里我们简单返回200表示Flask应用正在运行
    return jsonify({'status': 'alive'}), 200 
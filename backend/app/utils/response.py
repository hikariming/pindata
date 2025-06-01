from typing import Any, Dict, List, Optional
from flask import jsonify
import math

def success_response(data: Any = None, message: str = "操作成功", meta: Optional[Dict] = None) -> Dict:
    """成功响应格式"""
    response = {
        "success": True,
        "message": message,
        "data": data
    }
    
    if meta:
        response["meta"] = meta
    
    return response

def error_response(message: str = "操作失败", errors: Optional[Dict] = None, code: Optional[str] = None) -> Dict:
    """错误响应格式"""
    response = {
        "success": False,
        "message": message
    }
    
    if errors:
        response["errors"] = errors
    
    if code:
        response["code"] = code
    
    return response

def paginated_response(
    data: List[Any], 
    page: int, 
    per_page: int, 
    total: int, 
    message: str = "获取数据成功"
) -> Dict:
    """分页响应格式"""
    total_pages = math.ceil(total / per_page) if per_page > 0 else 0
    
    return {
        "success": True,
        "message": message,
        "data": data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    } 
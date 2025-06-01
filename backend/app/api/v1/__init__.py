from flask import Blueprint

api_v1 = Blueprint('api_v1', __name__)

# 导入所有端点
from .endpoints import datasets, tasks, plugins, raw_data, overview, libraries 
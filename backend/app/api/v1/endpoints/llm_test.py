# backend/app/api/v1/endpoints/llm_test.py
from flask import Blueprint, request, jsonify
from app.services.llm_test_service import LLMTestService

bp = Blueprint('llm_test', __name__, url_prefix='/llms')

@bp.route('/test', methods=['POST'])
def test_llm():
    """
    测试大模型配置
    ---
    tags:
      - LLM Test
    parameters:
      - in: body
        name: body
        schema:
          type: object
          properties:
            llm_config_id:
              type: string
              description: "要测试的大模型配置ID"
            prompt:
              type: string
              description: "用户输入的提示"
            image_url:
              type: string
              description: "（可选）用于多模态模型测试的图像URL"
    responses:
      200:
        description: "模型测试成功"
        schema:
          type: object
          properties:
            success:
              type: boolean
            result:
              type: object
              description: "模型的结构化输出"
      400:
        description: "请求参数错误"
      404:
        description: "未找到指定的大模型配置"
      500:
        description: "模型测试失败"
    """
    data = request.get_json()
    llm_config_id = data.get('llm_config_id')
    prompt = data.get('prompt')
    image_url = data.get('image_url')

    if not llm_config_id or not prompt:
        return jsonify({"success": False, "message": "缺少必要的参数：llm_config_id 和 prompt"}), 400

    try:
        result = LLMTestService.test_model(llm_config_id, prompt, image_url)
        return jsonify({"success": True, "result": result})
    except ValueError as e:
        return jsonify({"success": False, "message": str(e)}), 404
    except Exception as e:
        return jsonify({"success": False, "message": f"模型测试时发生内部错误: {str(e)}"}), 500

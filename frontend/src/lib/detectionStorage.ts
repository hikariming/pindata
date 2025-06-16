// 检测类别和对象的本地存储工具

interface CustomCategory {
  id: string;
  label: string;
  items: string[];
  createdAt: number;
}

interface CustomDetectionData {
  categories: CustomCategory[];
  customObjects: string[];
  lastUpdated: number;
}

const STORAGE_KEY = 'pindata_custom_detection';

// 获取用户自定义的检测数据
export const getCustomDetectionData = (): CustomDetectionData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load custom detection data:', error);
  }
  
  return {
    categories: [],
    customObjects: [],
    lastUpdated: Date.now()
  };
};

// 保存用户自定义的检测数据
export const saveCustomDetectionData = (data: CustomDetectionData): void => {
  try {
    data.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save custom detection data:', error);
    throw new Error('保存失败，请检查浏览器存储空间');
  }
};

// 添加自定义类别
export const addCustomCategory = (label: string, initialItems: string[] = []): CustomCategory => {
  const data = getCustomDetectionData();
  
  const newCategory: CustomCategory = {
    id: `custom_${Date.now()}`,
    label: label.trim(),
    items: initialItems.map(item => item.trim()).filter(item => item),
    createdAt: Date.now()
  };
  
  data.categories.push(newCategory);
  saveCustomDetectionData(data);
  
  return newCategory;
};

// 更新自定义类别
export const updateCustomCategory = (categoryId: string, updates: Partial<Omit<CustomCategory, 'id' | 'createdAt'>>): void => {
  const data = getCustomDetectionData();
  const categoryIndex = data.categories.findIndex(cat => cat.id === categoryId);
  
  if (categoryIndex >= 0) {
    data.categories[categoryIndex] = {
      ...data.categories[categoryIndex],
      ...updates
    };
    saveCustomDetectionData(data);
  }
};

// 删除自定义类别
export const deleteCustomCategory = (categoryId: string): void => {
  const data = getCustomDetectionData();
  data.categories = data.categories.filter(cat => cat.id !== categoryId);
  saveCustomDetectionData(data);
};

// 为类别添加新项目
export const addItemToCategory = (categoryId: string, item: string): void => {
  const data = getCustomDetectionData();
  const category = data.categories.find(cat => cat.id === categoryId);
  
  if (category) {
    const trimmedItem = item.trim();
    if (trimmedItem && !category.items.includes(trimmedItem)) {
      category.items.push(trimmedItem);
      saveCustomDetectionData(data);
    }
  }
};

// 从类别中移除项目
export const removeItemFromCategory = (categoryId: string, item: string): void => {
  const data = getCustomDetectionData();
  const category = data.categories.find(cat => cat.id === categoryId);
  
  if (category) {
    category.items = category.items.filter(i => i !== item);
    saveCustomDetectionData(data);
  }
};

// 添加自定义对象到全局列表
export const addCustomObject = (object: string): void => {
  const data = getCustomDetectionData();
  const trimmedObject = object.trim();
  
  if (trimmedObject && !data.customObjects.includes(trimmedObject)) {
    data.customObjects.push(trimmedObject);
    saveCustomDetectionData(data);
  }
};

// 从全局列表移除自定义对象
export const removeCustomObject = (object: string): void => {
  const data = getCustomDetectionData();
  data.customObjects = data.customObjects.filter(obj => obj !== object);
  saveCustomDetectionData(data);
};

// 清除所有自定义数据
export const clearCustomDetectionData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear custom detection data:', error);
  }
};

// 导出数据
export const exportCustomDetectionData = (): string => {
  const data = getCustomDetectionData();
  return JSON.stringify(data, null, 2);
};

// 导入数据
export const importCustomDetectionData = (jsonData: string): void => {
  try {
    const data = JSON.parse(jsonData) as CustomDetectionData;
    
    // 验证数据结构
    if (data && typeof data === 'object' && Array.isArray(data.categories) && Array.isArray(data.customObjects)) {
      saveCustomDetectionData(data);
    } else {
      throw new Error('Invalid data format');
    }
  } catch (error) {
    console.error('Failed to import custom detection data:', error);
    throw new Error('导入失败，数据格式不正确');
  }
};

// 获取存储使用统计
export const getStorageStats = () => {
  const data = getCustomDetectionData();
  return {
    categoriesCount: data.categories.length,
    totalItems: data.categories.reduce((sum, cat) => sum + cat.items.length, 0),
    customObjectsCount: data.customObjects.length,
    lastUpdated: new Date(data.lastUpdated).toLocaleString()
  };
};
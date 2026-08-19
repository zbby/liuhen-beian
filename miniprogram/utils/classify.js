/**
 * utils/classify.js
 * 事件自动分类（规则优先，模型兜底）
 * 
 * 策略：
 * 1. 关键词规则匹配（快速、确定性强）
 * 2. 多关键词命中加权（命中的关键词越多，置信度越高）
 * 3. 无命中时返回 "other"
 * 4. 预留模型分类接口（Phase 2 集成 NLP）
 */

/**
 * 自动分类
 * @param {string} text - 事件标题 + 描述文本
 * @param {string} eventType - 可选的事件类型提示（如甲供材模块传入 material_in）
 * @returns {{ categoryId: string, categoryName: string, confidence: number, matchedKeywords: string[] }}
 */
function classify(text, eventType) {
  const app = getApp();
  const categories = app.globalData.eventCategories;
  const textLower = (text || '').toLowerCase();

  // 如果有明确的事件类型提示，直接匹配
  if (eventType) {
    const directMatch = categories.find(c => c.id === eventType);
    if (directMatch) {
      return {
        categoryId: directMatch.id,
        categoryName: directMatch.name,
        icon: directMatch.icon,
        color: directMatch.color,
        confidence: 1.0,
        matchedKeywords: [],
        source: 'event_type'
      };
    }
  }

  // 关键词匹配 + 加权
  const results = categories
    .filter(c => c.keywords && c.keywords.length > 0)
    .map(c => {
      const matched = c.keywords.filter(kw => textLower.includes(kw.toLowerCase()));
      return {
        category: c,
        matchedKeywords: matched,
        score: matched.length
      };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  if (results.length > 0) {
    const best = results[0];
    const totalKeywords = best.category.keywords.length;
    const confidence = Math.min(1.0, best.score / Math.max(totalKeywords, 3) + 0.3);
    return {
      categoryId: best.category.id,
      categoryName: best.category.name,
      icon: best.category.icon,
      color: best.category.color,
      confidence: parseFloat(confidence.toFixed(2)),
      matchedKeywords: best.matchedKeywords,
      source: 'keyword'
    };
  }

  // 兜底
  const fallback = categories.find(c => c.id === 'other');
  return {
    categoryId: 'other',
    categoryName: fallback.name,
    icon: fallback.icon,
    color: fallback.color,
    confidence: 0.1,
    matchedKeywords: [],
    source: 'fallback'
  };
}

/**
 * 获取分类配置
 */
function getCategoryById(categoryId) {
  const app = getApp();
  return app.globalData.eventCategories.find(c => c.id === categoryId) || app.globalData.eventCategories.find(c => c.id === 'other');
}

/**
 * 获取所有分类
 */
function getAllCategories() {
  const app = getApp();
  return app.globalData.eventCategories;
}

module.exports = { classify, getCategoryById, getAllCategories };

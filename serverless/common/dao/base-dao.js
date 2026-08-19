/**
 * common/dao/base-dao.js
 * 基础 DAO 类 — 钉钉云数据库访问抽象层
 * 
 * 所有 DAO 继承此类，通过 db.collection() 操作文档。
 * 迁移时只需替换此类内部实现即可。
 */

class BaseDao {
  /**
   * @param {object} db  云数据库实例（由调用方注入）
   * @param {string} collectionName  集合名
   */
  constructor(db, collectionName) {
    this.db = db;
    this.collectionName = collectionName;
    this.collection = db.collection(collectionName);
  }

  /**
   * 根据 _id 查单条
   */
  async findById(id) {
    const res = await this.collection.doc(id).get();
    return res.data || null;
  }

  /**
   * 条件查单条
   */
  async findOne(query) {
    const res = await this.collection.where(query).limit(1).get();
    return (res.data && res.data[0]) || null;
  }

  /**
   * 条件查多条
   */
  async find(query, options = {}) {
    const { projection, sort, skip, limit } = options;
    let q = this.collection.where(query);
    if (projection) q = q.projection(projection);
    if (sort) {
      // sort: { created_at: -1 }
      q = q.sort(sort);
    }
    if (skip) q = q.skip(skip);
    if (limit) q = q.limit(limit);
    const res = await q.get();
    return res.data || [];
  }

  /**
   * 分页查询
   */
  async findPage(query, options = {}) {
    const { page = 1, size = 20, sort, projection } = options;
    const skip = (page - 1) * size;

    const [dataRes, countRes] = await Promise.all([
      this.find(query, { sort, projection, skip, limit: size }),
      this.collection.where(query).count(),
    ]);

    return {
      list: dataRes,
      total: countRes.total || 0,
      page,
      size,
      total_pages: Math.ceil((countRes.total || 0) / size),
    };
  }

  /**
   * 插入单条
   */
  async insertOne(doc) {
    const res = await this.collection.add(doc);
    return res.id || res._id || null;
  }

  /**
   * 批量插入
   */
  async insertMany(docs) {
    const res = await this.collection.add(docs);
    return res.insertedIds || [];
  }

  /**
   * 按 _id 更新
   */
  async updateById(id, update) {
    const res = await this.collection.doc(id).update(update);
    return res.updated || 0;
  }

  /**
   * 条件更新
   */
  async updateMany(query, update) {
    const res = await this.collection.where(query).update(update);
    return res.updated || 0;
  }

  /**
   * 按 _id 删除（物理删，一般不用）
   */
  async deleteById(id) {
    const res = await this.collection.doc(id).remove();
    return res.deleted || 0;
  }

  /**
   * 条件删除（物理删，一般不用）
   */
  async deleteMany(query) {
    const res = await this.collection.where(query).remove();
    return res.deleted || 0;
  }

  /**
   * 按 _id 软删除（添加 is_deleted 标记）
   */
  async softDeleteById(id) {
    return this.updateById(id, { is_deleted: true, deleted_at: new Date().toISOString() });
  }

  /**
   * 聚合查询
   */
  async aggregate(pipeline) {
    const res = await this.collection.aggregate(pipeline);
    return res.data || [];
  }

  /**
   * 计数
   */
  async count(query) {
    const res = await this.collection.where(query).count();
    return res.total || 0;
  }
}

module.exports = BaseDao;
